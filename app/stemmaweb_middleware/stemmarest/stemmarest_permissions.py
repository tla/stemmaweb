# pylint: skip-file
# flake8: noqa

import stemmaweb_middleware.stemmarest.permissions.filter as perm_filters
import stemmaweb_middleware.stemmarest.permissions.predicates as perm_predicates
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    Permission,
    PermissionConfig,
    UserRole,
)

from .stemmarest_endpoints import StemmarestEndpoint


def get_stemmarest_permission_config():
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
    traditions_config_user = []
