from stemmaweb_middleware.permissions.base_handler import BasePermissionHandler

from ...permissions.models import PermissionProvider
from ..permissions.declarations import StemmarestPermissionProvider
from ..stemmarest_client import APIClient
from ..stemmarest_endpoints import StemmarestEndpoint
from .service import StemmarestPermissionService


class StemmarestPermissionHandler(BasePermissionHandler[StemmarestEndpoint]):
    def __init__(self, provider: PermissionProvider[StemmarestEndpoint]):
        super().__init__(provider, "Stemmarest")


def get_stemmarest_permission_handler(
    client: APIClient,
) -> StemmarestPermissionHandler:
    service = StemmarestPermissionService(client)
    provider = StemmarestPermissionProvider(service)
    handler = StemmarestPermissionHandler(provider)
    return handler
