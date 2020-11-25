import argparse
import copy
import dataclasses
import datetime
import enum
import json
import logging
import logging.config
from functools import wraps
import pprint
import re
from typing import (
    Any,
    Callable,
    Dict,
    Generic,
    List,
    Optional,
    TypeVar,
    Union,
)

import slack
from slack.web.slack_response import SlackResponse
import requests


logger = logging.getLogger()


# Common
# ======

T = TypeVar('T')
R_SUBTEAM = re.compile(r'<!subteam\^([^|]+)\|@[^>]+>')


class UncopiableProxy(Generic[T]):
    __slots__ = ['_obj']

    def __init__(self, obj: T):
        self._obj = obj

    def __getattr__(self, name):
        return getattr(self._obj, name)

    def __setattr__(self, name, value):
        if name in self.__slots__:
            return super().__setattr__(name, value)
        else:
            return setattr(self._obj, name, value)

    def __getitem__(self, name):
        return self._obj.__getitem__(name)

    def __setitem__(self, name, value):
        return self._obj.__setitem__(name, value)

    def __repr__(self):
        return repr(self._obj)

    def __deepcopy__(self, memo):
        return UncopiableProxy(self._obj)


class WebAppClient:
    def __init__(self, cookie: str, token: str, base_url: str) -> None:
        self.cookie = cookie
        self.token = token
        self.base_url = base_url.rstrip('/')

    def request(
        self,
        method: str,
        path: str,
        data: Dict[str, str],
    ) -> requests.Response:
        url = f'{self.base_url}/{path.rstrip("/")}'
        data = {'token': self.token, **data}
        cookies = {
            k.strip(): v.strip()
            for k, v in
            [c.split('=', 1) for c in self.cookie.split(';')]
        }
        return requests.request(method, url, data=data, cookies=cookies)


def guard(
    pred: Callable[['State'], bool],
) -> Callable[[Callable], Callable]:
    def deco(f: Callable[..., None]):
        @wraps(f)
        def wrapper(state: 'State', *args, **kwargs) -> None:
            if pred(state):
                return f(state, *args, **kwargs)
            else:
                return None

        return wrapper

    return deco


# Data structures
# ===============


ACTION_TYPES = enum.Enum('ACTION_TYPES', [
    'OPEN',
    'MESSAGE',
    'GET_PREFS',
    'REACTION_REMOVED',
])


@dataclasses.dataclass
class Action:
    type_: ACTION_TYPES
    payload: Dict[str, Any]


@dataclasses.dataclass
class Channel:
    channel: str
    last_ts: int


@dataclasses.dataclass
class Message:
    channel: str
    user: str
    ts: str
    thread_ts: Optional[str]
    text: str
    is_bot: bool
    _payload: Dict[str, Any]

    @classmethod
    def from_payload(self, payload):
        data = payload.get('data')
        if all([
            data,
            'channel' in data,
            'ts' in data,
        ]):
            if 'bot_id' in data:
                # first of all, check if the data is sent by bot
                # Bot user also has its user id
                user = data['bot_id']
                is_bot = True
            elif 'user' in data:
                user = data['user']
                is_bot = False
            else:
                user = data.get('message', {}).get('user', 'UNKNOWN')
                is_bot = False

            if 'text' in data:
                text = data['text']
            else:
                text = data.get('message', {}).get('text', '')

            payload = UncopiableProxy(dict(payload))
            return Message(
                channel=data['channel'],
                user=user,
                ts=data['ts'],
                thread_ts=data.get('thread_ts'),
                text=text,
                is_bot=is_bot,
                _payload=payload,
            )
        else:
            return None


REACTION_STATE = enum.Enum('REACTION_STATE', ['ADDED', 'REMOVED'])


@dataclasses.dataclass
class Reaction:
    channel: str
    user: str
    ts: int
    reaction: str
    state: REACTION_STATE
    _payload: Dict[str, Any]

    @classmethod
    def from_removal_payload(cls, payload):
        return cls.from_payload(payload, REACTION_STATE.REMOVED)

    @classmethod
    def from_payload(
        cls,
        payload: Dict[str, Any],
        state: REACTION_STATE,
    ) -> Optional['Reaction']:
        # https://api.slack.com/events/reaction_added
        data = payload['data']
        if data['item']['type'] == 'message':
            return cls(
                channel=data['item']['channel'],
                user=data['user'],
                ts=data['item']['ts'],
                reaction=data['reaction'],
                state=state,
                _payload=data,
            )
        else:
            return None


@dataclasses.dataclass
class PrefsResponse:
    response: SlackResponse
    updated_at: datetime.datetime

    @property
    def muted_channels(self) -> List[str]:
        return self.response['prefs']['muted_channels'].split(',')

    @property
    def is_outdated(self):
        interval = datetime.timedelta(
            seconds=int(os.environ['APP_GET_PREFS_INT']),
        )
        now = datetime.datetime.now()
        return (now - self.updated_at) > interval


@dataclasses.dataclass
class State:
    web_client: Optional[UncopiableProxy[slack.WebClient]] = None
    self_id: Optional[str] = None
    #: the latest message was sent
    latest: Optional[Union[Message, Reaction]] = None
    channels: Dict[str, Channel] = dataclasses.field(default_factory=dict)
    prefs: Optional[PrefsResponse] = None

    @property
    def is_ready(self):
        return (
            self.web_client is not None and
            self.prefs is not None
        )


# Redux state like object
# =======================

class Store:
    def __init__(self, reducer, initial_state=None):
        self.reducer = reducer
        self._state = initial_state or State()
        self.subscribers = []

    def dispatch(self, action):
        if callable(action):
            action(self.dispatch, self.get_state)
        else:
            self.state = self.reducer(copy.deepcopy(self.state), action)

    def get_state(self):
        return self._state

    def set_state(self, new_state, silence=False):
        old_state = self._state
        self._state = new_state
        if old_state != new_state and not silence:
            self._notify()

    state = property(get_state, set_state)

    def _notify(self):
        for subscriber in self.subscribers:
            if subscriber is not None:
                try:
                    subscriber()
                except Exception:
                    logger.exception('a subscriber raised an exception')

    def subscribe(self, subscriber):
        self.subscribers += [subscriber]
        idx = len(self.subscribers) - 1

        def _unsubscribe():
            self.subscribers[idx] = None

        return _unsubscribe


# Redux reducer like object
# =========================


class Reducer:
    def __call__(self, state, action):
        reducer = {
            ACTION_TYPES.OPEN: self.on_open,
            ACTION_TYPES.MESSAGE: self.on_message,
            ACTION_TYPES.GET_PREFS: self.on_get_pref,
            ACTION_TYPES.REACTION_REMOVED: self.on_reaction_removed,
        }.get(action.type_)
        if reducer:
            try:
                return reducer(state, action)
            except Exception:
                logger.exception('an error occured during reducing')
        else:
            return state

    def on_open(self, state, action):
        state.self_id = action.payload['data']['self']['id']
        state.web_client = UncopiableProxy(action.payload['web_client'])
        return state

    def on_message(self, state, action):
        latest = Message.from_payload(action.payload)

        if latest:
            state.latest = latest
            state.channels[latest.channel] = Channel(
                channel=latest.channel,
                last_ts=latest.ts,
            )

        return state

    def on_get_pref(self, state, action):
        state.prefs = PrefsResponse(
            UncopiableProxy(action.payload),
            datetime.datetime.now(),
        )
        return state

    def on_reaction_removed(self, state, action):
        state.latest = Reaction.from_removal_payload(action.payload)
        return state


# Action creators
# ===============


def ac_open(payload):
    def _(dispatch, get_state):
        dispatch(Action(ACTION_TYPES.OPEN, payload))

        # get prefs
        web_client = payload['web_client']
        pref_payload = web_client.api_call('users.prefs.get')
        dispatch(Action(ACTION_TYPES.GET_PREFS, pref_payload))

    return _


def ac_message(payload):
    def _(dispatch, get_state):
        state = get_state()
        if state.prefs and state.prefs.is_outdated:
            pref_payload = state.web_client.api_call('users.prefs.get')
            dispatch(Action(ACTION_TYPES.GET_PREFS, pref_payload))

        dispatch(Action(
            ACTION_TYPES.MESSAGE,
            payload,
        ))

    return _


def ac_reaction_removed(payload):
    return Action(
        ACTION_TYPES.REACTION_REMOVED,
        payload,
    )


# Subscribers
# ===========

#: if the latest event is a message
_is_message = guard(lambda s: s.is_ready and isinstance(s.latest, Message))
#: if the latest event is a reaction
_is_reaction = guard(lambda s: s.is_ready and isinstance(s.latest, Reaction))
#: if the latest event happend in a thread
_is_in_thread = guard(lambda s: s.latest.thread_ts is not None)
#: if the event was fired by me
_is_mine = guard(lambda s: s.latest.user == s.self_id)


@_is_message
def suppress(
    state: State,
    client: WebAppClient,
    include_muted_channels: bool,
    include_dm: bool,
    include: List[str],
    exclude: List[str],
):
    def should_be_muted(
        state: State,
        include_muted_channels: bool,
        include_dm: bool,
        include: List[str],
        exclude: List[str],
    ):
        if not include_dm and state.latest.channel[0] in ['G', 'U']:
            return False

        return (
            include_muted_channels and
            state.latest.channel in state.prefs.muted_channels
        ) or (
            include and
            state.latest.channel in include
        ) or (
            exclude and
            state.latest.channel not in exclude
        )

    if should_be_muted(state, include_muted_channels, include_dm, include, exclude):
        response = client.request(
            'POST',
            '/api/conversations.mark',
            {
                'channel': state.latest.channel,
                'ts': state.latest.ts,
            },
        )
        if response.status_code != 200:
            logger.error(
                'Failed to call the API: status_code=%s, content=%s',
                response.status_code,
                response.content,
            )
        else:
            logger.info(
                'a message has been suppressed: channel=%s, ts=%s',
                state.latest.channel,
                state.latest.ts,
            )


@_is_message
@_is_in_thread
def suppress_thread(state: State, client: WebAppClient):
    response = client.request(
        'POST',
        '/api/subscriptions.thread.mark',
        {
            'channel': state.latest.channel,
            'thread_ts': state.latest.thread_ts,
            'ts': state.latest.ts,
            'read': '1',
        },
    )
    if (
        (response.status_code != 200) or
        (not response.json()['ok'])
    ):
        logger.error(
            'Failed to call the API: status_code=%s, content=%s',
            response.status_code,
            response.content,
        )
    else:
        logger.info(
            'the message in a thread has been suppressed: channel=%s, ts=%s',
            state.latest.channel,
            state.latest.ts,
        )


@_is_message
@_is_mine
def suggest_time_card(state):
    if (
        'おわり' in state.latest.text or
        '終わり' in state.latest.text or
        '開始' in state.latest.text or
        'かいし' in state.latest.text
    ):
        text = '出勤簿を忘れずに: ' + os.environ['APP_TIME_CARD']
        state.web_client.chat_postMessage(
            channel=os.environ['APP_DM_TO_SELF'],
            text=text,
        )


@_is_message
def mark_unread(state: State):
    def in_usergroup(
        client: slack.WebClient,
        user: str,
        text: str,
    ):
        for usergroup in R_SUBTEAM.findall(text):
            resp = client.usergroups_users_list(usergroup=usergroup)
            if resp['ok'] and (user in resp['users']):
                return True
        else:
            return False

    if (
        (f'<@{state.self_id}>' in state.latest.text) or
        in_usergroup(state.web_client, state.self_id, state.latest.text)
    ):
        name = os.environ['APP_UNREAD_REACTION']
        try:
            state.web_client.reactions_add(
                channel=state.latest.channel,
                name=name,
                timestamp=state.latest.ts,
            )
        except slack.errors.SlackApiError as e:
            if e.response['error'] != 'already_reacted':
                raise


@_is_reaction
@_is_mine
@guard(lambda s: (
    (s.latest.reaction == os.environ['APP_UNREAD_REACTION']) and
    (s.latest.state == REACTION_STATE.REMOVED)
))
def mark_read(state: State):
    name = os.environ['APP_READ_REACTION']
    try:
        logger.info(
            'marking as read: channel=%s, ts=%s',
            state.latest.channel,
            state.latest.ts,
        )
        state.web_client.reactions_add(
            channel=state.latest.channel,
            name=name,
            timestamp=state.latest.ts,
        )
    except slack.errors.SlackApiError as e:
        if e.response['error'] != 'already_reacted':
            raise


@_is_message
@_is_mine
def on_message(state: State, conf: List[Dict[str, str]]):
    for c in conf:
        method = getattr(state.latest.text, c['method'])
        assert callable(method)
        if method(*c['arguments']):
            state.web_client.chat_postMessage(
                channel=c['channel'],
                text=c['text'],
            )


def main_debug(argv):
    token = os.environ['SLACK_USER_ACCESS_TOKEN']
    client = slack.WebClient(token=token)
    print(client.usergroups_users_list(usergroup='S0NCX9B1P'))


def main_suppress(argv):
    token = os.environ['SLACK_USER_ACCESS_TOKEN']
    rtm_client = slack.RTMClient(token=token)

    web_app_cookie = os.environ['SLACK_WEB_APP_COOKIE']
    web_app_token = os.environ['SLACK_WEB_APP_TOKEN']
    web_app_base_url = os.environ['SLACK_WEB_APP_BASE_URL']
    web_app_client = WebAppClient(
        web_app_cookie,
        web_app_token,
        web_app_base_url,
    )
    on_message_conf = json.loads(os.environ.get('APP_ON_MESSAGE_CONF', '[]'))

    store = Store(Reducer())

    store.subscribe(lambda: logger.info(
        'state=%s',
        pprint.pformat(store.state)
    ))
    store.subscribe(lambda: suppress(store.state, web_app_client, argv.include_muted_channels, argv.include_dm, argv.include, argv.exclude))  # noqa: E501
    store.subscribe(lambda: suppress_thread(store.state, web_app_client))
    store.subscribe(lambda: suggest_time_card(store.state))
    store.subscribe(lambda: mark_unread(store.state))
    store.subscribe(lambda: mark_read(store.state))
    store.subscribe(lambda: on_message(store.state, on_message_conf))

    rtm_client.run_on(event='open')(lambda **payload: store.dispatch(
        ac_open(payload),
    ))
    rtm_client.run_on(event='message')(lambda **payload: store.dispatch(
        ac_message(payload),
    ))
    rtm_client.run_on(event='reaction_removed')(lambda **payload: store.dispatch(  # noqa: E501

        ac_reaction_removed(payload),
    ))

    return rtm_client.start()


def main(argv):
    # configure a logging facility
    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'default',
                'filters': [],
            },
        },
        'formatters': {
            'default': {
                'format': '%(asctime)s %(levelname)-8s %(name)-15s %(message)s',  # noqa: E501
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
        },
        'root': {
            'level': 'INFO',
            'handlers': ['console'],
        },
    })

    # create a parent parser
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(required=True)

    # configure a subparser for supress
    parser_suppress = subparsers.add_parser('suppress')
    parser_suppress.add_argument(
        '--include-dm',
        action='store_true',
        default=False,
    )
    parser_suppress.add_argument(
        '--include-muted-channels',
        action='store_true',
        default=True,
    )
    inc_exc_group = parser_suppress.add_mutually_exclusive_group()
    inc_exc_group.add_argument(
        '--include',
        help='channels to be suppressed',
        nargs='*',
        type=str,
    )
    inc_exc_group.add_argument(
        '--exclude',
        help='channels not to be suppressed',
        nargs='*',
        type=str,
    )
    parser_suppress.set_defaults(func=main_suppress)

    # configure a subparser for debug
    parser_debug = subparsers.add_parser('debug')
    parser_debug.set_defaults(func=main_debug)

    args = parser.parse_args(argv or [''])
    return args.func(args)


if __name__ == '__main__':
    import sys
    import os

    if os.path.isfile('.env'):
        with open('.env') as f:
            for line in f.read().split('\n'):
                if line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    os.environ[k.rstrip()] = v.lstrip()

    main(list(sys.argv[1:]))
