# pylint: skip-file
# flake8: noqa
from loguru import logger

import stemmaweb_middleware.permissions.predicates as perm_predicates_base
from stemmaweb_middleware.permissions.models import (
    EndpointAccess,
    EndpointAccessPredicate,
    Permission,
    PermissionArguments,
    PermissionConfig,
    UserRole,
)
from stemmaweb_middleware.resources.stemmarest.permissions.service import (
    StemmarestPermissionService,
)

def _get_tradition_info(client, path_segments):
    (tpath, tradition_id) = path_segments[:2]
    if tpath != 'tradition':
        logger.warn("Calling tradition-level filter on a path that doesn't start with /tradition?!")
        return None
    r = client.request(
        path=f"/tradition/{tradition_id}",
        method="GET"
    )
    if r.status_code != 200:
        logger.warn(f"Attempt to retrieve info for tradition {tradition_id} failed with status {r.status}: {r.text}")
        return None
    return r.json()


# Return a predicate to check ownership of the tradition in question
def ownership_factory(client) -> EndpointAccessPredicate:
    """Returns a predicate that will evaluate to true if the user owns the tradition at the base of the request,
    and false otherwise. Requires a separate API call to find out."""

    def user_owns_tradition(args: PermissionArguments) -> bool:
        logger.debug("Checking ownership of tradition")
        # Anonymous users don't own anything
        if args["user"].is_anonymous:
            return False
        tradition_info = _get_tradition_info(client, args["path_segments"])
        if tradition_info is None:
            return False
        # We check against a non-None string, in case the user ID is somehow none
        return tradition_info.get("owner", 'NO_OWNER') == args.get("user").id
    
    return user_owns_tradition


# Return a predicate to check public visibility of the tradition in question
def viewable_factory(client) -> EndpointAccessPredicate:
    """Returns a predicate that will evaluate to true if the tradition at the base of the request is marked as public.
    Requires a separate API call to find out."""

    def tradition_is_viewable(args: PermissionArguments) -> bool:
        logger.debug("Checking viewability of tradition")
        tradition_info = _get_tradition_info(client, args["path_segments"])
        if tradition_info is None:
            return False
        # If it's public they can view it regardless
        if tradition_info.get("is_public", False):
            return True
        # If they aren't logged in they can't vew it
        if args["user"].is_anonymous:
            return False
        # Otherwise they have to own it
        return tradition_info.get("owner", 'NO_OWNER') == args.get("user").id
    
    return tradition_is_viewable

# Configuration for guests, users, admins
def config(
    service: StemmarestPermissionService, args: PermissionArguments
) -> dict[UserRole, list[PermissionConfig]]:
    """Role-based configuration for the `/tradition/*` Stemmarest endpoint."""
    unrestricted = PermissionConfig(
        endpoint_access=EndpointAccess(
            name="Allow full access",
            description="Allowing full access",
            predicate=perm_predicates_base.always_true,
            if_true={Permission.READ, Permission.WRITE},
        ),
    )

    read_write = PermissionConfig(
        endpoint_access=EndpointAccess(
            name="Allow read-write",
            description="Allowing read-write access",
            predicate=ownership_factory(service.client),
            if_true={Permission.WRITE},
        ),
    )
    read_only = PermissionConfig(
        endpoint_access=EndpointAccess(
            name="Allow read-only",
            description="Allowing read-only access",
            predicate=viewable_factory(service.client),
            if_true={Permission.READ},
        ),
    )

    tradition_config_guest = [read_only] # orig
    tradition_config_user = [read_only, read_write]
    tradition_config_admin = [unrestricted]
    tradition_config = {
        UserRole.GUEST: tradition_config_guest,
        UserRole.USER: tradition_config_user,
        UserRole.ADMIN: tradition_config_admin,
    }
    return tradition_config
