# pylint: skip-file
# flake8: noqa

import stemmaweb_middleware.resources.stemmarest.permissions.filter as perm_filters
import stemmaweb_middleware.resources.stemmarest.permissions.predicates as perm_predicates
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
    """Role-based configuration for the `/traditions` Stemmarest endpoint."""
    traditions_config_guest = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="List Public Traditions",
                description="Public traditions can be listed",
                predicate=perm_predicates.always_true,
                if_true={Permission.READ},
            ),
            response_transformer=perm_filters.public_resources_only,
        )
    ]
    traditions_config_user = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="List Public & Owned Traditions",
                description="Public and own traditions can be listed",
                predicate=perm_predicates.always_true,
                if_true={Permission.READ},
            ),
            response_transformer=perm_filters.owned_resources_only_factory(args),
        )
    ]
    traditions_config_admin = [*traditions_config_user]
    traditions_config = {
        UserRole.GUEST: traditions_config_guest,
        UserRole.USER: traditions_config_user,
        UserRole.ADMIN: traditions_config_admin,
    }
    return traditions_config
