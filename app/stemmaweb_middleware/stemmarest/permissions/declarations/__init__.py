"""
Facade collecting all the permission declarations
for the supported Stemmarest endpoints.
"""
from stemmaweb_middleware.permissions.models import PermissionArguments

from ...stemmarest_endpoints import StemmarestEndpoint
from ..service import StemmarestPermissionService
from . import traditions


def get_stemmarest_permission_config(
    service: StemmarestPermissionService, args: PermissionArguments
):
    return {
        StemmarestEndpoint.TRADITIONS: traditions.config(service, args),
    }
