import json

from flask import Blueprint, request
from flask.wrappers import Response
from werkzeug.routing import Rule

from stemmaweb_middleware.permissions.models import PermissionArguments
from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints


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
                query_params=request.args,
                body=request.json if request.is_json else None,
            )

            stemmarest_endpoint = "/" + "/".join(path_segments)
            try:
                response = stemmarest_client.request(
                    path=stemmarest_endpoint,
                    method=args["method"],
                    params=args["query_params"],
                    data=args["body"],
                )

                return Response(
                    response=response.content,
                    status=response.status_code,
                    mimetype=response.headers.get("Content-Type", None),
                )
            except Exception as e:
                return Response(
                    response=json.dumps(
                        dict(
                            message="An error occurred in the middleware.",
                            type=f"{type(e).__name__}",
                            error=str(e),
                        )
                    ),
                    status=500,
                    mimetype="application/json",
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
