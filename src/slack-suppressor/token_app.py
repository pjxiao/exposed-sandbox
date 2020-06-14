import os

from flask import (
    Flask,
    request,
)
import slack

app = Flask(__name__)


OAUTH_SCOPE = 'client'
CLIENT_ID = os.environ['SLACK_CLIENT_ID']
CLIENT_SECRET = os.environ['SLACK_CLIENT_SECRET']


@app.route("/begin", methods=["GET"])
def begin():
    return f'''
    <form action="https://slack.com/oauth/authorize" method="GET">
        <input type="hidden" name="client_id" value="{CLIENT_ID}" />
        <input type="text" name="scope" value="{OAUTH_SCOPE}" />
        <input type="submit" />
    </form>
    '''


@app.route('/token')
def token():
    code = request.args['code']
    token = slack.WebClient(token='').oauth_access(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        code=code,
    )['access_token']
    return '\n'.join([f'code: {code}', f'token: {token}'])
