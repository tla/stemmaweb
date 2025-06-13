from abc import ABC
from typing import Generic

from loguru import logger

from .models import (
    EndpointType,
    Permission,
    PermissionArguments,
    PermissionCheckResult,
    PermissionConfig,
    PermissionProvider,
    ResponseTransformer,
)


class BasePermissionHandler(ABC, Generic[EndpointType]):
    """
    This class implements the permission checking logic in a generic way,
    using the supplied ``PermissionProvider`` to retrieve the configuration.
    """

    def __init__(self, provider: PermissionProvider[EndpointType], name: str):
        self.provider = provider
        self.name = name

    def check(self, args: PermissionArguments) -> PermissionCheckResult:
        # API endpoint without the middleware-local prefix and trailing slash
        # Example: /api/annotations -> /annotations, /stemweb/somepath -> /somepath
        endpoint = "/" + "/".join(args["path_segments"])
        logger.debug(f"[{self.name}] Checking permissions for {endpoint}")

        # Match the endpoint and test whether we support it or not
        matched_endpoint: EndpointType | None = self.provider.endpoint_type.match(endpoint)  # type: ignore # noqa: E501
        if matched_endpoint is None:
            return PermissionCheckResult(
                violations=[
                    "The middleware forbids to access requested endpoint.",
                    "No endpoint declaration found.",
                ],
                allowed_http_methods=set(),
                response_transformer=None,
            )

        # Check against the configuration
        permission_config = self.provider.get_permission_config(args)
        endpoint_config = permission_config.get(matched_endpoint, None)

        # Make sure that we declared permissions
        if endpoint_config is None:
            return PermissionCheckResult(
                violations=[
                    "The middleware forbids to access the requested endpoint.",
                    "No configuration found for this endpoint.",
                ],
                allowed_http_methods=set(),
                response_transformer=None,
            )

        user_role = args["user_role"]
        config_for_user: list[PermissionConfig] = endpoint_config.get(user_role, [])
        if len(config_for_user) == 0:
            return PermissionCheckResult(
                violations=[
                    "The middleware forbids to access the requested endpoint.",
                    f"No permissions declared for the user role {user_role}.",
                ],
                allowed_http_methods=set(),
                response_transformer=None,
            )

        violations = []
        allowed_http_methods = set()
        chained_transformer: ResponseTransformer | None = None

        # Process each permission config object
        for cfg in config_for_user:
            # Check endpoint access
            predicate_passed = cfg.endpoint_access.predicate(args)
            if not predicate_passed:
                violations.append(cfg.endpoint_access.to_violation_str())
                continue
            allowed_http_methods.update(
                Permission.iterable_to_http_methods(cfg.endpoint_access.if_true)
            )

            # Embed the current response transformer into the previous one
            if cfg.response_transformer is not None:
                chained_transformer = cfg.response_transformer(chained_transformer, args)

        return PermissionCheckResult(
            violations=violations,
            allowed_http_methods=allowed_http_methods,
            response_transformer=chained_transformer,
        )
