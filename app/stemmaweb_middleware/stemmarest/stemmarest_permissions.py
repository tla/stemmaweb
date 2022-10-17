# pylint: skip-file
# flake8: noqa

import stemmaweb_middleware.stemmarest.permissions.filter as perm_filters
import stemmaweb_middleware.stemmarest.permissions.predicates as perm_predicates
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    Permission,
    PermissionArguments,
    PermissionConfig,
    UserRole,
)

from .permissions.service import StemmarestPermissionService
from .stemmarest_endpoints import StemmarestEndpoint


def get_stemmarest_permission_config(
    service: StemmarestPermissionService, args: PermissionArguments
):
    traditions_config_guest = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="List Traditions",
                description="Traditions can be listed only with the 'public=true' query parameter",
                predicate=perm_predicates.public_true_in_query_params,
                if_true={Permission.READ},
            )
        )
    ]
    traditions_config_user = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="List Traditions",
                description="Traditions can be listed",
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

    return {
        StemmarestEndpoint.TRADITIONS: traditions_config,
    }
