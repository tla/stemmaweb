import json

from flask import Request, request
from flask.wrappers import Response
from loguru import logger

from stemmaweb_middleware.permissions import current_user, determine_user_role
from stemmaweb_middleware.permissions.base_handler import BasePermissionHandler
from stemmaweb_middleware.permissions.models import PermissionArguments
from stemmaweb_middleware.resources.base import APIClient
from stemmaweb_middleware.utils import abort, files_to_bytes


def build_api_endpoint(segments: str, *, force_trailing_slash: bool = False) -> str:
    """
    Builds the upstream path for a passthrough request from the wildcard
    ``segments`` captured by the Flask route.

    :param segments: the wildcard path segments, as captured by Flask.
    :param force_trailing_slash: whether the target backend requires a trailing
        slash regardless of how it was addressed.
    :return: the path to request from the upstream API.
    """
    path_segments = [segment for segment in segments.split("/") if segment]
    endpoint = "/" + "/".join(path_segments)
    if path_segments and (force_trailing_slash or segments.endswith("/")):
        endpoint += "/"
    return endpoint


def handle_passthrough_request(
    client: APIClient,
    permission_handler: BasePermissionHandler,
    segments: str,
    *,
    force_trailing_slash: bool = False,
):
    """
    Checks permissions for the incoming request and, if it is allowed,
    forwards it to the upstream API.

    :param client: `APIClient` to forward the request with.
    :param permission_handler: `BasePermissionHandler` used to authorize it.
    :param segments: the wildcard path segments, as captured by Flask.
    :param force_trailing_slash: whether the target backend requires a trailing
        slash. Defaults to forwarding the path exactly as it was addressed.
    :return: a Flask response.
    """
    path_segments = tuple(segment for segment in segments.split("/") if segment)
    args = PermissionArguments(
        method=request.method,
        endpoint=request.path,
        path_segments=path_segments,
        query_params=request.args.to_dict(),
        data=__extract_data_from_request(request),
        headers=dict(request.headers),
        user=current_user,
        user_role=determine_user_role(current_user),
    )

    api_endpoint = build_api_endpoint(
        segments, force_trailing_slash=force_trailing_slash
    )
    logger.debug(f'Passthrough requested for "{api_endpoint}" with args {args}')

    # The heavy-lifting for permission checking is done in `permission_handler.check`
    (
        violations,
        allowed_http_methods,
        response_transformer,
    ) = permission_handler.check(args=args)

    # If the user is not allowed to access the requested endpoint, we abort the request
    if request.method not in allowed_http_methods:
        return abort(
            status=403,
            message="The caller has insufficient permissions "
            "to access this resource.",
            body=dict(
                violations=violations, allowed_http_methods=list(allowed_http_methods)
            ),
        )

    # Otherwise, we allow the request to pass through
    try:
        # This is a requests.Response
        response = client.request(
            path=api_endpoint,
            method=args["method"],
            params=args["query_params"],
            files=files_to_bytes(request.files),
            # See difference between the 'json' and 'data' arguments passed to `requests.request` here:  # noqa: E501
            # https://stackoverflow.com/questions/47188244/what-is-the-difference-between-the-data-and-json-named-arguments-with-reques#47188297  # noqa: E501
            **{"json" if request.is_json else "data": args["data"]},
        )
        # See what kind of content we are dealing with.
        content_is_json = False
        content_type = response.headers.get("Content-Type", "")
        is_binary = not (
            content_type.startswith("text/")
            or "json" in content_type
            or "xml" in content_type
        )
        if is_binary:
            # Just pass it through unchanged.
            content = response.content
        else:
            # Decode it, either from JSON or from text encoding
            try:
                content = response.json()
                content_is_json = True
            except json.JSONDecodeError:
                content = response.text
            # Transform it if we need to
            if response_transformer is not None:
                logger.debug("passthrough_handler: Applying response transformer")
                content = response_transformer(content)
            # Re-encode it
            if content_is_json:
                content = json.dumps(content, ensure_ascii=False)
            else:
                content = content.encode("utf-8")

        # Patching response headers
        # Needed, since Stemweb returns a Content-Type of "text/html" in some cases
        # even though the response is JSON.
        # Checking and handling this client-side would be tedious, so we do it here.
        mimetype = response.headers.get("Content-Type", None)
        if content_is_json:
            mimetype = "application/json"

        # This is a Flask response
        return Response(
            response=content,
            status=response.status_code,
            mimetype=mimetype,
        )
    except Exception as e:
        return abort(
            status=500,
            message="An error occurred while processing the request.",
            body=dict(type=f"{type(e).__name__}", message=str(e)),
        )


def __extract_data_from_request(req: Request):
    """
    Extracts data from a Flask request object. Handles both JSON and form data.
    The return value is compatible with the `requests` library.

    :param req: the Flask request object.
    :return:
    """
    if req.is_json:
        return req.json
    elif len(req.form) > 0:
        return req.form
    else:
        return None
