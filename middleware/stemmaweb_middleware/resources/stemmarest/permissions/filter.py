import json
from requests.exceptions import JSONDecodeError
from requests.models import Response
from typing import Any
from stemmaweb_middleware.permissions.models import PermissionArguments, ResponseTransformer


def _filter_factory(new_fn: ResponseTransformer, existing_fn: ResponseTransformer) -> ResponseTransformer:
    """
    Returns a response transformer that encloses the existing one.
    """
    if not existing_fn:
        return lambda response: new_fn(response)
    else:
        return lambda response: new_fn(existing_fn(response))


def public_resources_only_factory(transformer: ResponseTransformer, args: PermissionArguments) -> ResponseTransformer:
    """
    Returns a response transformer that filters out all traditions that are not public.
    We determine whether a traditions is public by checking the `is_public` field.

    :param response: The response to transform.
    :return: The response with a filtered list of traditions, each of which represents a public resource.
    """
    def public_filter(response):
        if not isinstance(response, list):
            return response
        list_of_dicts: list[dict] = [resource for resource in response if resource.get("is_public", False)]
        return list_of_dicts
    
    return _filter_factory(public_filter, transformer) 


def owned_resources_only_factory(transformer: ResponseTransformer, args: PermissionArguments) -> ResponseTransformer:
    """
    Returns a response transformer that filters out all traditions that are not
    public or owned by the user making the request.

    :param transformer: A function that takes a Response and returns the (modified, if necessary) Response. This will
        be wrapped by the transformer we return.
    :param args: The permission arguments for the request.
    :return: A response transformer that wraps the original transformer.
    """
    owner_id = ""
    try:
        owner_id = args["user"].id  # type: ignore
    except Exception:
        pass

    def _owned_resources_only(response: Any) -> Response:
        if not isinstance(response, list):
            return response
        list_of_dicts: list[dict] = [
            resource
            for resource in response
            if resource.get("is_public", False) or resource.get("owner") == owner_id
        ]
        return list_of_dicts

    return _filter_factory(_owned_resources_only, transformer)
