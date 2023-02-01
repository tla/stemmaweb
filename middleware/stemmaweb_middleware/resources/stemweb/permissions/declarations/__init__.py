"""
Facade collecting all the permission declarations
for the supported Stemweb endpoints.
"""

from stemmaweb_middleware.permissions import UserRole
from stemmaweb_middleware.permissions.models import (
    PermissionArguments,
    PermissionConfig,
    PermissionProvider,
)

from ...stemweb_endpoints import StemwebEndpoint
from ..service import StemwebPermissionService
from . import calculate, discovery, job_status, result


class StemwebPermissionProvider(PermissionProvider[StemwebEndpoint]):
    def __init__(self, service: StemwebPermissionService):
        self.service = service

    @property
    def endpoint_type(self) -> type[StemwebEndpoint]:
        return StemwebEndpoint

    def get_permission_config(
        self, permission_arguments: PermissionArguments
    ) -> dict[StemwebEndpoint, dict[UserRole, list[PermissionConfig]]]:
        service = self.service
        args = permission_arguments
        return {
            StemwebEndpoint.RESULT: result.config(service, args),
            StemwebEndpoint.CALCULATE: calculate.config(service, args),
            StemwebEndpoint.DISCOVERY: discovery.config(service, args),
            StemwebEndpoint.JOB_STATUS: job_status.config(service, args),
        }
