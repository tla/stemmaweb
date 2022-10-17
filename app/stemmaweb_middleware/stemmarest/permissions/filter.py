from typing import Any


def public_resources_only(response: Any) -> list[dict]:
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [resource for resource in list_of_dicts if resource.get("is_public", False)]


def owned_resources_only(response: Any, owner_id: str) -> list[dict]:
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [resource for resource in list_of_dicts if resource.get("owner") == owner_id]
