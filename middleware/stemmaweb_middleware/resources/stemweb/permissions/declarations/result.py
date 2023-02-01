import stemmaweb_middleware.permissions.predicates as perm_predicates_base
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    Permission,
    PermissionArguments,
    PermissionConfig,
    UserRole,
)
from stemmaweb_middleware.resources.stemweb.permissions.service import (
    StemwebPermissionService,
)


def config(
    service: StemwebPermissionService, args: PermissionArguments
) -> dict[UserRole, list[PermissionConfig]]:
    """Role-based configuration for the `/stemmatology/result` Stemweb endpoint."""
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
    tradition_config_guest = [*base_config]
    tradition_config_user = [*base_config]
    tradition_config_admin = [*base_config]
    tradition_config = {
        UserRole.GUEST: tradition_config_guest,
        UserRole.USER: tradition_config_user,
        UserRole.ADMIN: tradition_config_admin,
    }
    return tradition_config
