# pylint: skip-file
# flake8: noqa


import stemmaweb_middleware.permissions.predicates as perm_predicates_base
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    Permission,
    PermissionArguments,
    PermissionConfig,
    UserRole,
)
from stemmaweb_middleware.resources.stemmarest.permissions.service import (
    StemmarestPermissionService,
)


def config(
    service: StemmarestPermissionService, args: PermissionArguments
) -> dict[UserRole, list[PermissionConfig]]:
    """Role-based configuration for the `/tradition/*` Stemmarest endpoint."""
    read_write = PermissionConfig(
        endpoint_access=EndpointAccess(
            name="Allow read-write",
            description="Allowing read-write access",
            predicate=perm_predicates_base.always_true,
            if_true={Permission.READ, Permission.WRITE},
        ),
    )
    read_only = PermissionConfig(
        endpoint_access=EndpointAccess(
            name="Allow read-only",
            description="Allowing read-only access",
            predicate=perm_predicates_base.always_true,
            if_true={Permission.READ},
        ),
    )
    tradition_config_guest = [read_only]
    tradition_config_user = [read_write]
    tradition_config_admin = [read_write]
    tradition_config = {
        UserRole.GUEST: tradition_config_guest,
        UserRole.USER: tradition_config_user,
        UserRole.ADMIN: tradition_config_admin,
    }
    return tradition_config
