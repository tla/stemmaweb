from flask import Blueprint, request
from flask.wrappers import Response
from loguru import logger
from werkzeug.routing import Rule

from stemmaweb_middleware.permissions import current_user, determine_user_role
from stemmaweb_middleware.permissions.models import PermissionArguments
from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.stemmarest.permissions import (
    get_stemmarest_permission_handler,
)
from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints
from stemmaweb_middleware.utils import abort


def blueprint_factory(
    endpoints: StemmarestEndpoints, stemmarest_client: StemmarestClient
):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/api/*`.

    :param endpoints: `StemmarestEndpoints` object containing endpoint information.
    :param stemmarest_client: `StemmarestClient` to interact with the Stemmarest API.
    :return: the configured Flask blueprint.
    """
    blueprint = Blueprint("api", __name__)
    ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]
    ROUTE_PREFIX = "/api"
    permission_handler = get_stemmarest_permission_handler(stemmarest_client)

    def wildcard_route_handler_func_factory(rule: Rule, nesting_level: int):
        """
        Creates a function to handle wildcard routes
        associated with the supplied `rule` at the given `nesting_level`.

        :param rule: the `Rule` object associated with the wildcard route.
        :param nesting_level: the nesting level of the wildcard route.
        :return: the function to handle the wildcard route,
                 to be registered via `add_url_rule`.
        """

        def handler(**kwargs):
            path_segments = tuple(kwargs.values())
            args = PermissionArguments(
                method=request.method,
                endpoint=request.path,
                path_segments=path_segments,
                query_params=request.args.to_dict(),
                body=request.json if request.is_json else None,
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
                    data=args["body"],
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

        return handler

    # Actually register the wildcard routes with the handlers
    for i, r in enumerate(endpoints.rules):
        blueprint.add_url_rule(
            rule="/".join([ROUTE_PREFIX, r.rule]),
            endpoint=r.endpoint,
            view_func=wildcard_route_handler_func_factory(rule=r, nesting_level=i),
            methods=ALLOWED_METHODS,
        )

    return blueprint
