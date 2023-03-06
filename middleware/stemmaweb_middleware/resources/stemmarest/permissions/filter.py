from typing import Any

from stemmaweb_middleware.permissions.models import PermissionArguments


def public_resources_only(response: Any) -> list[dict]:
    """
    Response transformer that filters out all resources that are not public.
    We determine whether a resource is public by checking the `is_public` field.

    :param response: The response to transform.
    :return: A list of dictionaries, each of which represents a public resource.
    """
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [resource for resource in list_of_dicts if resource.get("is_public", False)]


def owned_resources_only_factory(args: PermissionArguments):
    """
    Returns a response transformer that filters out all resources that are not
    public or owned by the user making the request.

    :param args: The permission arguments for the request.
    :return: A response transformer.
    """
    owner_id = ""
    try:
        owner_id = args["user"].id  # type: ignore
    except Exception:
        pass
    return lambda response: _owned_resources_only(response, owner_id)


def _owned_resources_only(response: Any, owner_id: str) -> list[dict]:
    """
    Response transformer that filters out all resources that are not public or
    owned by the user identified by ``owner_id``.

    :param response: The response to transform.
    :param owner_id: The ID of the user making the request.
    :return: A list of dictionaries, each of which represents
             a resource accessible to the user.
    """
    if not isinstance(response, list):
        return response
    list_of_dicts: list[dict] = response
    return [
        resource
        for resource in list_of_dicts
        if resource.get("is_public", False) and resource.get("owner") == owner_id
    ]
