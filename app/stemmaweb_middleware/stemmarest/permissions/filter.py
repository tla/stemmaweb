from typing import Any

from stemmaweb_middleware.permissions.models import PermissionArguments


def public_resources_only(response: Any) -> list[dict]:
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [resource for resource in list_of_dicts if resource.get("is_public", False)]


def owned_resources_only_factory(args: PermissionArguments):
    owner_id = ""
    try:
        owner_id = args["user"].id  # type: ignore
    except Exception:
        pass
    return lambda response: _owned_resources_only(response, owner_id)


def _owned_resources_only(response: Any, owner_id: str) -> list[dict]:
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [
        resource
        for resource in list_of_dicts
        if resource.get("is_public", False) and resource.get("owner") == owner_id
    ]
