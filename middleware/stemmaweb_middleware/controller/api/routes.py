from flask import Blueprint

from stemmaweb_middleware.resources.base import APIClient, handle_passthrough_request
from stemmaweb_middleware.resources.stemmarest.permissions import (
    get_stemmarest_permission_handler,
)


def blueprint_factory(stemmarest_client: APIClient):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/api/*`.

    :param stemmarest_client: `APIClient` to interact with the Stemmarest API.
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
        return f"[{permission_handler.name}] Passthrough is healthy", 200

    @blueprint.route(f"/{ROUTE_PREFIX}/<path:segments>", methods=ALLOWED_METHODS)
    def wildcard(segments: str):
        """
        Handler catching incoming requests to `/api/*`.
        After permission checks, the request is forwarded to the Stemmarest API.

        :param segments: the path segments after `/api/`.
        :return: a Flask response.
        """
        return handle_passthrough_request(
            client=stemmarest_client,
            permission_handler=permission_handler,
            segments=segments,
        )

    return blueprint
