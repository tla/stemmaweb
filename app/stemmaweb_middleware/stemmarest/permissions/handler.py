from typing import Any, Callable

from stemmaweb_middleware.permissions.models import (
    PermissionArguments,
    PermissionCheckResult,
    UserRole,
)

from ..stemmarest_client import StemmarestClient
from .service import StemmarestPermissionService

ResponseTransformer = Callable[[Any], Any]


class StemmarestPermissionHandler:
    def __init__(self, service: StemmarestPermissionService):
        self.service = service

    def check(
        self, args: PermissionArguments, user_role: UserRole
    ) -> PermissionCheckResult:
        return PermissionCheckResult(
            violations=[], allowed_http_methods=set("GET"), response_transformer=None
        )


def get_stemmarest_permission_handler(
    client: StemmarestClient,
) -> StemmarestPermissionHandler:
    service = StemmarestPermissionService(client)
    handler = StemmarestPermissionHandler(service)
    return handler
