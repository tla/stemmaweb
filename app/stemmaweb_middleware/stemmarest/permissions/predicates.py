from stemmaweb_middleware.permissions.models import Permission, PermissionArguments


def traditions_guest(args: PermissionArguments) -> set[Permission]:
    """
    Grant read-only permissions to public traditions for guest users
    when visiting `/api/traditions`.
    """
    only_public_requested = (
        args["query_params"].get("public", "false").lower() == "true"
    )
    if only_public_requested:
        return {Permission.READ}
    else:
        return {Permission.FORBIDDEN}
