from flask import Blueprint, request
from werkzeug.routing import Rule

from stemmaweb_middleware.stemmarest.permissions.models import PermissionArguments
from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints


def blueprint_factory(endpoints: StemmarestEndpoints):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/api/*`.

    :param endpoints: `StemmarestEndpoints` object containing endpoint information.
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
            permission_args = PermissionArguments(
                method=request.method,
                endpoint=request.path,
                path_segments=path_segments,
                query_params=request.args,
                body=request.json if request.is_json else None,
            )
            return permission_args

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
