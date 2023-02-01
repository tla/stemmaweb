from stemmaweb_middleware.permissions.models import (
    EndpointAccessPredicate,
    PermissionArguments,
)


def always_true(args: PermissionArguments) -> bool:
    return True


def always_false(args: PermissionArguments) -> bool:
    return False


def has_query_params(key: str, value: str) -> EndpointAccessPredicate:
    def pred(args: PermissionArguments) -> bool:
        return args["query_params"].get(key, "").lower() == value

    return pred
