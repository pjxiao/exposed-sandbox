"""A CLI app script skeleton"""
import argparse
import logging
import logging.config
from textwrap import dedent
from typing import List


logger = logging.getLogger(__name__)


def main_subcommand_a(args) -> int:
    """An implementation of subcommand-a"""
    return 0


def _configure_logging(log_level: str) -> None:
    """Configure the logging facility"""
    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '%(asctime)s %(levelname)-8s %(name)-15s %(message)s',
                'datefmt': '%Y-%m-%dT%H:%M:%S',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'default',
                'level': log_level,
            },
        },
        'root': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
        'loggers': {},
    })


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=dedent(
            """\
            TODO: Write a command description here
            """
        ),
    )
    parser.add_argument('--log-level', default='INFO')
    subparsers = parser.add_subparsers(required=True)

    # sub command a
    parser_a = subparsers.add_parser(
        'sub-command-a',
        help=dedent(
            """\
            TODO: Write a sub command description here
            """
        ),
    )
    parser_a.add_argument(
        '--arg-a',
        default='DEFAULT-VALUE',
        help='TODO: Write a help message',
    )
    parser_a.set_defaults(func=main_subcommand_a)

    # main
    args = parser.parse_args(argv or ['-h'])
    _configure_logging(log_level=args.log_level)
    logger.debug('given option: %s', vars(args))
    return args.func(args)


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
