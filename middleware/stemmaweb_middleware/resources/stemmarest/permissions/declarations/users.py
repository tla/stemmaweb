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
    """Role-based configuration for the `/users/*` Stemmarest endpoint."""
    base_config = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Allow all",
                description="Allowing full access for now",
                predicate=perm_predicates_base.always_true,
                if_true={Permission.READ, Permission.WRITE},
            ),
        )
    ]
    users_config_guest = [*base_config]
    users_config_user = [*base_config]
    users_config_admin = [*base_config]
    users_config = {
        UserRole.GUEST: users_config_guest,
        UserRole.USER: users_config_user,
        UserRole.ADMIN: users_config_admin,
    }
    return users_config
