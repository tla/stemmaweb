from typing import Callable

from flask import request
from flask_login import current_user as _current_user
from loguru import logger

from stemmaweb_middleware.models import AuthUser, CurrentUser, StemmawebUser
from stemmaweb_middleware.utils import abort

from .models import UserRole

# Aliasing for automatic type-hinting
current_user: CurrentUser = _current_user


def require_host(whitelist: str | list[str]) -> Callable:
    """
    Decorates a function to enforce that it is only called from a specific host.
    Tests against the host of `flask.request`.

    :param whitelist: the list of allowed hosts
    :return: the decorated function which will return an error response
             if the current host is not in the list of allowed hosts
    """

    allowed_hosts = whitelist if isinstance(whitelist, list) else [whitelist]

    def decorator(func: Callable) -> Callable:
        return hosts_required(allowed_hosts, func)

    return decorator


def hosts_required(allowed_hosts: list[str], func: Callable) -> Callable:
    """
    Wraps a function to enforce that it is only called from a specific host.
    Tests against the host of `flask.request`.

    :param allowed_hosts: the list of allowed hosts
    :param func: the function to decorate
    :return: the decorated function which will return an error response
             if the current host is not in the list of allowed hosts
    """

    def wrapper(*args, **kwargs):
        hostname = request.remote_addr
        logger.debug(
            f"Checking host '{hostname}' against allowed hosts {allowed_hosts}"
        )
        if hostname not in allowed_hosts:
            return abort(
                status=403,
                message=f"This resource is not accessible from host {hostname}.",
            )
        return func(*args, **kwargs)

    return wrapper


def require_min_user_role(user_role: UserRole) -> Callable:
    """
    Decorates a function to enforce a minimum user role for its calling.
    Tests against the role of `flask_login.current_user`.
    If no user is present, only `UserRole.GUEST` is allowed.

    :param user_role: the minimum user role required
    :return: the decorated function which will return an error response
             if the current user has no sufficient privileges
    """

    def decorator(func: Callable) -> Callable:
        return min_user_role_required(user_role, func)

    return decorator


def min_user_role_required(user_role: UserRole, func: Callable) -> Callable:
    """
    Wraps a function to enforce a minimum user role for its calling.
    Tests against the role of `flask_login.current_user`.
    If no user is present, only `UserRole.GUEST` is allowed.

    :param user_role: the minimum user role required
    :param func: the function to decorate
    :return: the decorated function which will return an error response
             if the current user has no sufficient privileges
    """

    def wrapper(*args, **kwargs):
        user: CurrentUser = current_user
        user_is_anonym = user is None or user.is_anonymous
        if user_is_anonym and user_role != UserRole.GUEST:
            return abort(
                status=403,
                message="This resource is not accessible to guests. "
                "Please log in to create a user session cookie.",
            )
        elif user_is_anonym and user_role == UserRole.GUEST:
            return func(*args, **kwargs)

        auth_user: AuthUser = user
        stemmaweb_user: StemmawebUser = auth_user.data  # type: ignore
        if not UserRole.is_valid_label(stemmaweb_user.role):
            return abort(
                status=500, message=f"Unrecognized user role: {stemmaweb_user.role}"
            )

        curr_user_role = UserRole.from_str(stemmaweb_user.role)
        if curr_user_role.numeric_value < user_role.numeric_value:
            return abort(
                status=403,
                message=f"This resource needs at least "
                f"'{user_role.label}' permissions.",
            )

        return func(*args, **kwargs)

    return wrapper


def determine_user_role(user: CurrentUser) -> UserRole:
    """
    Returns the current user's role.
    If no user is present, only `UserRole.GUEST` is allowed.

    :return: the current user's role
    """
    user_is_anonym = user is None or user.is_anonymous
    if user_is_anonym:
        return UserRole.GUEST

    auth_user: AuthUser = user
    stemmaweb_user: StemmawebUser = auth_user.data  # type: ignore
    if not UserRole.is_valid_label(stemmaweb_user.role):
        return UserRole.GUEST

    return UserRole.from_str(stemmaweb_user.role)
