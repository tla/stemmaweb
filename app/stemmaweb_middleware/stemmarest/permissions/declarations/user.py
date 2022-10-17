# pylint: skip-file
# flake8: noqa

import stemmaweb_middleware.stemmarest.permissions.predicates as perm_predicates
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    Permission,
    PermissionArguments,
    PermissionConfig,
    UserRole,
)
from stemmaweb_middleware.stemmarest.permissions.service import (
    StemmarestPermissionService,
)


def config(service: StemmarestPermissionService, args: PermissionArguments):
    """Role-based configuration for the `/user/*` Stemmarest endpoint."""
    base_config = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Allow all",
                description="Allowing full access for now",
                predicate=perm_predicates.always_true,
                if_true={Permission.READ, Permission.WRITE},
            ),
        )
    ]
    user_config_guest = [*base_config]
    user_config_user = [*base_config]
    user_config_admin = [*base_config]
    user_config = {
        UserRole.GUEST: user_config_guest,
        UserRole.USER: user_config_user,
        UserRole.ADMIN: user_config_admin,
    }
    return user_config
