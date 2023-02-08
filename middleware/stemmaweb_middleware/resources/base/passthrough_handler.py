from flask import Request, request
from flask.wrappers import Response
from loguru import logger

from stemmaweb_middleware.permissions import current_user, determine_user_role
from stemmaweb_middleware.permissions.base_handler import BasePermissionHandler
from stemmaweb_middleware.permissions.models import PermissionArguments
from stemmaweb_middleware.resources.base import APIClient
from stemmaweb_middleware.utils import abort, files_to_bytes


def handle_passthrough_request(
    client: APIClient, permission_handler: BasePermissionHandler, segments: str
):
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

    api_endpoint = "/" + "/".join(path_segments) + "/"
    logger.debug(f'Passthrough requested for "{api_endpoint}" with args {args}')
    (
        violations,
        allowed_http_methods,
        response_transformer,
    ) = permission_handler.check(args=args)

    if request.method not in allowed_http_methods or len(violations) > 0:
        return abort(
            status=403,
            message="The caller has insufficient permissions "
            "to access this resource.",
            body=dict(violations=violations),
        )

    try:
        response = client.request(
            path=api_endpoint,
            method=args["method"],
            params=args["query_params"],
            files=files_to_bytes(request.files),
            # See difference between the 'json' and 'data' arguments passed to `requests.request` here:  # noqa: E501
            # https://stackoverflow.com/questions/47188244/what-is-the-difference-between-the-data-and-json-named-arguments-with-reques#47188297  # noqa: E501
            **{"json" if request.is_json else "data": args["data"]},
        )
        if response_transformer is not None:
            logger.debug("Applying response transformer")
            response = response_transformer(response)

        return Response(
            response=response.content,
            status=response.status_code,
            mimetype=response.headers.get("Content-Type", None),
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
