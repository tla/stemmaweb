from flask import Blueprint, Request, request
from flask.wrappers import Response
from loguru import logger

from stemmaweb_middleware.permissions import current_user, determine_user_role
from stemmaweb_middleware.permissions.models import PermissionArguments
from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.stemmarest.permissions import (
    get_stemmarest_permission_handler,
)
from stemmaweb_middleware.utils import abort, files_to_bytes


def blueprint_factory(stemmarest_client: StemmarestClient):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/api/*`.

    :param stemmarest_client: `StemmarestClient` to interact with the Stemmarest API.
    :return: the configured Flask blueprint.
    """
    blueprint = Blueprint("api", __name__)
    ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]
    ROUTE_PREFIX = "/api"
    permission_handler = get_stemmarest_permission_handler(stemmarest_client)

    @blueprint.route(f"/{ROUTE_PREFIX}", methods=["GET"])
    @blueprint.route(f"/{ROUTE_PREFIX}/", methods=["GET"])
    def passthrough_health():
        """
        Handler catching incoming GET requests to `/api` and `/api/`.
        Returns a 200 status code and a message
        indicating that the passthrough is healthy.

        :return: a tuple containing a message and a 200 status code.
        """
        return "Passthrough is healthy", 200

    @blueprint.route(f"/{ROUTE_PREFIX}/<path:segments>", methods=ALLOWED_METHODS)
    def wildcard(segments: str):
        """
        Handler catching incoming requests to `/api/*`.
        After permission checks, the request is forwarded to the Stemmarest API.

        :param segments:
        :return:
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

        stemmarest_endpoint = "/" + "/".join(path_segments)
        logger.debug(
            f'Passthrough requested for "{stemmarest_endpoint}" with args {args}'
        )
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
            response = stemmarest_client.request(
                path=stemmarest_endpoint,
                method=args["method"],
                params=args["query_params"],
                files=files_to_bytes(request.files),
                **{"json" if request.is_json else "data": args["data"]}
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

    return blueprint


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
