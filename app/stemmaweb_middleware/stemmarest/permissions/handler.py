from typing import Any, Callable

from stemmaweb_middleware.permissions.models import (
    PermissionArguments,
    PermissionCheckResult,
)

from ..stemmarest_client import StemmarestClient
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
        # stemmarest_endpoint = "/" + "/".join(args["path_segments"])
        return PermissionCheckResult(
            violations=[], allowed_http_methods={"GET"}, response_transformer=None
        )


def get_stemmarest_permission_handler(
    client: StemmarestClient,
) -> StemmarestPermissionHandler:
    service = StemmarestPermissionService(client)
    handler = StemmarestPermissionHandler(service)
    return handler
