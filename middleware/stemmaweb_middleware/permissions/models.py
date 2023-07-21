from abc import ABC, abstractmethod
from enum import Enum
from typing import (
    Any,
    Callable,
    Generic,
    Iterable,
    NamedTuple,
    Optional,
    Protocol,
    TypedDict,
    TypeVar,
)

import pydantic

from stemmaweb_middleware.models import CurrentUser


class UserRole(Enum):
    """Enum class to represent user roles that influence permissions."""

    GUEST = (0, "guest")
    USER = (1, "user")
    ADMIN = (2, "admin")

    @staticmethod
    def from_str(role: str) -> "UserRole":
        """
        Converts a string to a `UserRole`.

        :param role: The string to convert.
        :return: The corresponding `UserRole`.
        """
        return UserRole[role.upper()]

    @staticmethod
    def is_valid_label(label: str) -> bool:
        """
        Checks if a string is a valid label for a `UserRole`.

        :param label: The string to check.
        :return: True if the string is a valid label, False otherwise.
        """
        return label.lower() in [role.label for role in UserRole]

    @property
    def numeric_value(self) -> int:
        """
        :return: the numeric value of the role
        """
        return self.value[0]

    @property
    def label(self) -> str:
        """
        :return: the label of the role
        """
        return self.value[1]


class Permission(Enum):
    """
    Possible permissions to be associated with a single resource.
    In the context of this app a resource is a Stemmarest endpoint.
    """

    READ = "read"
    WRITE = "write"
    FORBIDDEN = "forbidden"

    def to_http_methods(self) -> list[str]:
        """
        :return: the HTTP methods that are allowed for this permission
        """
        if self == Permission.READ:
            return ["GET"]
        elif self == Permission.WRITE:
            return ["GET", "POST", "PUT", "PATCH", "DELETE"]
        else:
            return []

    @staticmethod
    def iterable_to_http_methods(permissions: Iterable["Permission"]) -> list[str]:
        """
        :param permissions: an iterable of permissions
        :return: the HTTP methods that are allowed for these permissions
        """
        if Permission.FORBIDDEN in permissions:
            return []
        http_methods: list[str] = []
        for permission in permissions:
            http_methods.extend(permission.to_http_methods())
        return http_methods


class PermissionArguments(TypedDict):
    """Type of the argument based on which a `PermissionsPerRole` is determined."""

    method: str
    endpoint: str
    path_segments: tuple[str, ...]
    query_params: dict[str, Any]
    data: dict[str, Any] | None
    headers: dict[str, Any]
    user: CurrentUser
    user_role: UserRole


"""
Signature of a function to associate permissions with an endpoint,
such as whether it has READ, WRITE, or FORBIDDEN permissions.
"""
EndpointAccessPredicate = Callable[[PermissionArguments], bool]


class EndpointAccess(pydantic.BaseModel):
    """
    Model describing the access to an endpoint.
    It defines a ``name`` and ``description`` for debugging purposes,
    as well as a ``predicate`` callback function that gets evaluated
    whenever an endpoint associated with an instance of this class is accessed.
    In case of a positive evaluation, the ``if_true`` permissions are granted.
    The permissions represent the HTTP methods that are allowed for the endpoint.

    This is necessary, since there are endpoints such as Stemmarest's
    ``/tradition/{tradId}/``, where only GET is allowed for guests,
    while PUT, and DELETE are allowed for users and admins.

    Using an ``EndpointAccess`` instance, we can enforce this logic
    by creating a ``predicate`` that checks the ``PermissionArguments``
    for a user's role. Under the hood, we check the session cookie,
    based on which the user role can be determined.
    If no (valid) session cookie is present, the user is a guest. If a session
    cookie is present, we extract the user ID from it and check the database for
    the user's actual role.
    """

    name: str
    description: str | None = None
    predicate: EndpointAccessPredicate
    if_true: set[Permission]

    def to_violation_str(self):
        """
        :return: a string representation of the violation.
                 Gets returned to the frontend in case of permission violations.
        """
        res = self.name
        if self.description is not None:
            res += f": {self.description}"
        return res


"""
Signature of a function to transform a response body.
Should be used to filter items from responses
which the user is not allowed to see.
"""
ResponseTransformer = Callable[[Any], Any]


class PermissionConfig(pydantic.BaseModel):
    """Model to represent a permission"""

    endpoint_access: EndpointAccess
    response_transformer: ResponseTransformer | None = None


class PermissionCheckResult(NamedTuple):
    """Model to represent the response of a permission check"""

    """List of violated permissions for debugging purposes"""
    violations: list[str]

    """HTTP methods that are allowed for the current user"""
    allowed_http_methods: set[str]

    """
    Response transformer to be applied to the response,
    allowing role-based and user-data-based filtering.
    """
    response_transformer: ResponseTransformer | None


class Matchable(Protocol):
    """
    Protocol for classes that implement a `match` method, used
    to match against a path.

    The actual classes complying with this protocol currently are
    stemmarest_endpoints.py::StemmarestEndpoint and
    stemweb_endpoints.py::StemwebEndpoint.

    The matching mechanism is used for the passthrough logic,
    so that whenever a Flask wildcard route is invoked, we can
    associate the requested endpoint with a static, managed endpoint.
    This is necessary so that we can associate permissions with given endpoints
    in an explicit, declarative way.
    """

    @staticmethod
    def match(path: str) -> Optional["Matchable"]:
        pass


EndpointType = TypeVar("EndpointType", bound=Matchable)


class PermissionProvider(ABC, Generic[EndpointType]):
    """
    Interface for classes to provide permission configuration for a given resource.
    We use permission providers for Stemweb and Stemmarest endpoints.
    """

    @abstractmethod
    def get_permission_config(
        self,
        permission_arguments: PermissionArguments,
    ) -> dict[EndpointType, dict[UserRole, list[PermissionConfig]]]:
        """
        Returns a dictionary of permissions per user role for a given endpoint
        based on the supplied ``permission_arguments``.

        :param permission_arguments: the arguments arriving with the request
        :return: a dictionary of permissions per user role for a given endpoint
        """
        raise NotImplementedError

    @property
    @abstractmethod
    def endpoint_type(self) -> type[EndpointType]:
        """
        :return: the type of the endpoint this provider is responsible for
        """
        raise NotImplementedError
