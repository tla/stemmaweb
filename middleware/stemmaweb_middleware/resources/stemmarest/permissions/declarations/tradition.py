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

# `StemmarestEndpoint.TRADITION` covers two different shapes of request: the
# collection endpoint `/tradition` (a POST there creates a new tradition) and the
# item endpoint `/tradition/{tradId}`. Both map to the same enum member, because
# the endpoint matcher only ever compares the *first* path segment. Predicates
# therefore have to inspect `path_segments` themselves to tell the two apart.
COLLECTION_SEGMENTS = ("tradition",)


# TODO this should surface an error if the API client gets an error code... 
def _get_tradition_info(client, path_segments):
    """
    Fetches the metadata of the tradition addressed by ``path_segments``. Returns
    ``None`` if there is no tradition ID, or the tradition ID doesn't exist or has
    a problem. 

    :param client: the ``APIClient`` used to talk to Stemmarest.
    :param path_segments: the path segments of the incoming request.
    :return: the tradition's metadata, or ``None`` if there is nothing to inspect.
    """
    if len(path_segments) < 2 or path_segments[0] != COLLECTION_SEGMENTS[0]:
        logger.debug(
            f"No tradition id in path {'/'.join(path_segments)!r}; "
            "nothing to inspect."
        )
        return None

    tradition_id = path_segments[1]
    try:
        r = client.request(path=f"/tradition/{tradition_id}", method="GET")
    except Exception as e:
        logger.warning(f"Could not retrieve tradition {tradition_id}: {e}")
        return None
    if r.status_code != 200:
        logger.warning(
            f"Attempt to retrieve info for tradition {tradition_id} failed "
            f"with status {r.status_code}: {r.text}"
        )
        return None
    return r.json()


# Return a predicate to check ownership of the tradition in question
def ownership_factory(client) -> EndpointAccessPredicate:
    """Returns a predicate that will evaluate to true if the user owns the tradition at the base of the request,
    and false otherwise. Requires a separate API call to find out."""

    def user_owns_tradition(args: PermissionArguments) -> bool:
        logger.debug("Checking ownership of tradition")
        user = args["user"]
        # Anonymous users don't own anything
        if user is None or user.is_anonymous:
            return False
        tradition_info = _get_tradition_info(client, args["path_segments"])
        if tradition_info is None:
            return False
        # We check against a non-None value, in case the user ID is somehow none
        owner_id = getattr(user, "id", None)
        return owner_id is not None and tradition_info.get("owner") == owner_id

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
        user = args["user"]
        # If they aren't logged in they can't view it
        if user is None or user.is_anonymous:
            return False
        # Otherwise they have to own it
        owner_id = getattr(user, "id", None)
        return owner_id is not None and tradition_info.get("owner") == owner_id

    return tradition_is_viewable


def _requested_owner(args: PermissionArguments) -> str | None:
    """
    Returns the owner the request asks for, or `None` if it does not name one.

    :param args: the permission arguments.
    :return: the requested `userId`, if it is a string.
    """
    data = args["data"]
    if not data:
        return None
    owner = data.get("userId")
    return owner if isinstance(owner, str) else None


def creating_own_tradition(args: PermissionArguments) -> bool:
    """
    Predicate for the creation of a brand-new tradition, i.e. `POST /tradition`.

    There is no existing tradition to inspect in this case, so the ownership and
    visibility predicates cannot apply. Three conditions have to hold: the
    request is a creation, it comes from a logged-in user (guests may not
    upload), and it asks for the new tradition to be owned by that same user.

    :param args: the permission arguments.
    :return: True if the request creates a new tradition owned by its caller.
    """
    if args["method"] != "POST" or args["path_segments"] != COLLECTION_SEGMENTS:
        return False
    if args["user_role"] == UserRole.GUEST:
        return False
    user = args["user"]
    if user is None or user.is_anonymous:
        return False
    owner_id = getattr(user, "id", None)
    return owner_id is not None and _requested_owner(args) == owner_id


# Configuration for guests, users, admins
def config(
    service: StemmarestPermissionService, args: PermissionArguments
) -> dict[UserRole, list[PermissionConfig]]:
    """
    Role-based configuration for the `/tradition/*` Stemmarest endpoint.

    All three roles share one list of rules and the predicates do the
    discriminating: `check()` takes the union of every rule whose predicate
    passes, so the policy reads top to bottom as "admins may do anything; anyone
    who can see a tradition can read it; only its owner may modify it; logged-in
    users may create new ones".
    """
    policy = [
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Admin full access",
                description="Admins may read and modify any tradition",
                predicate=perm_predicates_base.has_role(UserRole.ADMIN),
                if_true={Permission.READ, Permission.WRITE},
            ),
        ),
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Create own tradition",
                description="Logged-in users may create a tradition they own",
                predicate=creating_own_tradition,
                if_true={Permission.WRITE},
            ),
        ),
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Read public or owned tradition",
                description="Public traditions, and traditions you own, are readable",
                predicate=viewable_factory(service.client),
                if_true={Permission.READ},
            ),
        ),
        PermissionConfig(
            endpoint_access=EndpointAccess(
                name="Write owned tradition",
                description="Only the owner may modify a tradition",
                predicate=ownership_factory(service.client),
                if_true={Permission.WRITE},
            ),
        ),
    ]

    # The role keys are listed explicitly rather than derived from `UserRole`, so
    # that a role added in the future is denied by `BasePermissionHandler`
    # instead of silently inheriting this policy.
    return {role: policy for role in (UserRole.GUEST, UserRole.USER, UserRole.ADMIN)}
