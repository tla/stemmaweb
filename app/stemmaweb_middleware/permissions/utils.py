import json
from typing import Callable

from flask.wrappers import Response
from flask_login import current_user
from werkzeug.local import LocalProxy

from stemmaweb_middleware.models import AuthUser, CurrentUser, StemmawebUser

from .models import UserRole

current_user_role = LocalProxy(lambda: _get_current_user_role())


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
            return Response(
                response=json.dumps(
                    dict(
                        code=403,
                        type="ERROR",
                        message="This resource is not accessible to guests. "
                        "Please send authorization credentials "
                        "as HTTP Headers.",
                    )
                ),
                status=403,
                mimetype="application/json",
            )
        elif user_is_anonym and user_role == UserRole.GUEST:
            return func(*args, **kwargs)

        auth_user: AuthUser = user
        stemmaweb_user: StemmawebUser = auth_user.data  # type: ignore
        if not UserRole.is_valid_label(stemmaweb_user.role):
            return Response(
                response=json.dumps(
                    dict(
                        code=500,
                        type="ERROR",
                        message=f"Unrecognized user role: {stemmaweb_user.role}",
                    )
                ),
                status=500,
                mimetype="application/json",
            )

        curr_user_role = UserRole.from_str(stemmaweb_user.role)
        if curr_user_role.numeric_value < user_role.numeric_value:
            return Response(
                response=json.dumps(
                    dict(
                        code=403,
                        type="ERROR",
                        message=f"This resource needs at least "
                        f"'{user_role.label}' permissions.",
                    )
                ),
                status=403,
                mimetype="application/json",
            )

        return func(*args, **kwargs)

    return wrapper


def _get_current_user_role() -> UserRole:
    """
    Returns the current user's role.
    If no user is present, only `UserRole.GUEST` is allowed.

    :return: the current user's role
    """

    user: CurrentUser = current_user
    user_is_anonym = user is None or user.is_anonymous
    if user_is_anonym:
        return UserRole.GUEST

    auth_user: AuthUser = user
    stemmaweb_user: StemmawebUser = auth_user.data  # type: ignore
    if not UserRole.is_valid_label(stemmaweb_user.role):
        return UserRole.GUEST

    return UserRole.from_str(stemmaweb_user.role)
