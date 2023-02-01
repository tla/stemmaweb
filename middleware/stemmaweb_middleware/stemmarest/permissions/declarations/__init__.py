"""
Facade collecting all the permission declarations
for the supported Stemmarest endpoints.
"""

from stemmaweb_middleware.permissions import UserRole
from stemmaweb_middleware.permissions.models import (
    PermissionArguments,
    PermissionConfig,
    PermissionProvider,
)

from ...stemmarest_endpoints import StemmarestEndpoint
from ..service import StemmarestPermissionService
from . import tradition, traditions, user, users


class StemmarestPermissionProvider(PermissionProvider[StemmarestEndpoint]):
    def __init__(self, service: StemmarestPermissionService):
        self.service = service

    @property
    def endpoint_type(self) -> type[StemmarestEndpoint]:
        return StemmarestEndpoint

    def get_permission_config(
        self, permission_arguments: PermissionArguments
    ) -> dict[StemmarestEndpoint, dict[UserRole, list[PermissionConfig]]]:
        service = self.service
        args = permission_arguments
        return {
            StemmarestEndpoint.TRADITIONS: traditions.config(service, args),
            StemmarestEndpoint.TRADITION: tradition.config(service, args),
            StemmarestEndpoint.USERS: users.config(service, args),
            StemmarestEndpoint.USER: user.config(service, args),
        }
