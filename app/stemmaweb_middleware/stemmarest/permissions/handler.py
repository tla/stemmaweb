from typing import Any, Callable

from loguru import logger

from stemmaweb_middleware.permissions.models import (
    Permission,
    PermissionArguments,
    PermissionCheckResult,
    PermissionConfig,
)

from ..permissions.declarations import get_stemmarest_permission_config
from ..stemmarest_client import StemmarestClient
from ..stemmarest_endpoints import StemmarestEndpoint
from .service import StemmarestPermissionService

ResponseTransformer = Callable[[Any], Any]


class StemmarestPermissionHandler:
    def __init__(self, service: StemmarestPermissionService):
        self.service = service

    def check(
        self,
        args: PermissionArguments,
    ) -> PermissionCheckResult:
        # API endpoint without '/api' prefix and trailing slash
        stemmarest_endpoint = "/" + "/".join(args["path_segments"])
        logger.debug(f"Checking permissions for {stemmarest_endpoint}")

        # Match the endpoint and test whether we support it or not
        matched_endpoint = StemmarestEndpoint.match(stemmarest_endpoint)
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
        permission_config = get_stemmarest_permission_config(self.service, args)
        endpoint_config = permission_config.get(matched_endpoint, None)

        # Make sure that we declared permissions
        if endpoint_config is None:
            return PermissionCheckResult(
                violations=[
                    "The middleware forbids to access requested endpoint.",
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
                    "The middleware forbids to access requested endpoint.",
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
                chained_transformer = cfg.response_transformer(
                    (chained_transformer or (lambda x: x))
                )

        return PermissionCheckResult(
            violations=violations,
            allowed_http_methods=allowed_http_methods,
            response_transformer=chained_transformer,
        )


def get_stemmarest_permission_handler(
    client: StemmarestClient,
) -> StemmarestPermissionHandler:
    service = StemmarestPermissionService(client)
    handler = StemmarestPermissionHandler(service)
    return handler
