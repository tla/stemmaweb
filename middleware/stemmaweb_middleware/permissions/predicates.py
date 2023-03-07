"""
This module collects utility methods to make it easier to define
endpoint access predicates.
"""
from stemmaweb_middleware.permissions.models import (
    EndpointAccessPredicate,
    PermissionArguments,
)


def always_true(args: PermissionArguments) -> bool:
    """
    Always returns True.

    :param args: The permission arguments.
    :return: True.
    """
    return True


def always_false(args: PermissionArguments) -> bool:
    """
    Always returns False.

    :param args: The permission arguments.
    :return: False.
    """
    return False


def has_query_params(key: str, value: str) -> EndpointAccessPredicate:
    """
    Returns a predicate that checks if the query parameters contain a
    key-value pair.

    :param key: the key to check
    :param value: the value to check
    :return: the predicate
    """

    def pred(args: PermissionArguments) -> bool:
        return args["query_params"].get(key, "").lower() == value

    return pred
