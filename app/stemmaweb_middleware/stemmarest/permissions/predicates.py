from stemmaweb_middleware.permissions.models import PermissionArguments


def always_true(args: PermissionArguments) -> bool:
    return True


def always_false(args: PermissionArguments) -> bool:
    return False


def public_true_in_query_params(args: PermissionArguments) -> bool:
    only_public_requested = (
        args["query_params"].get("public", "false").lower() == "true"
    )
    return only_public_requested
