from enum import Enum
from typing import Any, Callable, TypedDict

from stemmaweb_middleware.models import UserRole


class Permission(Enum):
    """
    Possible permissions to be associated with a single resource.
    In the context of this app a resource is a Stemmarest endpoint.
    """

    READ = "read"
    WRITE = "write"
    FORBIDDEN = "forbidden"


"""A dictionary associating a list of permissions with a user role."""
PermissionsPerRole = dict[UserRole, list[Permission]]


class PermissionArguments(TypedDict):
    """Type of the argument based on which a `PermissionsPerRole` is determined."""

    method: str
    endpoint: str
    path_segments: tuple[str, ...]
    query_params: dict[str, Any]
    body: dict[str, Any] | None


"""
Signature of a function that returns a `PermissionsPerRole` dictionary
based on `PermissionArguments` input.
"""
PermissionPredicate = Callable[[PermissionArguments], PermissionsPerRole]


class PermissionConfig(TypedDict):
    """Model to represent a permission"""

    name: str
    description: str
    predicate: PermissionPredicate
