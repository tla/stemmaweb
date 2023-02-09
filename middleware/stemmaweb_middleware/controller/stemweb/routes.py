from flask import Blueprint, Response, request
from loguru import logger
from flask_login import current_user
from stemmaweb_middleware.permissions import (
    UserRole,
    require_min_user_role,
)
from stemmaweb_middleware.resources.base import APIClient, handle_passthrough_request
from stemmaweb_middleware.resources.stemweb.permissions import (
    get_stemweb_permission_handler,
)
from stemmaweb_middleware.utils import success, try_parse_model

from . import models


def blueprint_factory(stemweb_client: APIClient):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/stemweb/*`.

    :param stemweb_client: `APIClient` to interact with the Stemweb API.
    :return: the configured Flask blueprint.
    """
    blueprint = Blueprint("stemweb", __name__)
    ALLOWED_METHODS = ["GET", "POST"]
    ROUTE_PREFIX = "/stemweb"
    permission_handler = get_stemweb_permission_handler(stemweb_client)

    @blueprint.route(f"/{ROUTE_PREFIX}", methods=["GET"])
    @blueprint.route(f"/{ROUTE_PREFIX}/", methods=["GET"])
    def passthrough_health():
        """
        Handler catching incoming GET requests to `/stemweb` and `/stemweb/`.
        Returns a 200 status code and a message
        indicating that the passthrough is healthy.

        :return: a tuple containing a message and a 200 status code.
        """
        return f"[{permission_handler.name}] Passthrough is healthy", 200

    @require_min_user_role(UserRole.USER)
    def poll_results():
        """
        Handler catching incoming GET requests to `/stemweb/result`.
        Only authenticated clients are allowed to call this endpoint.
        The Stemweb API should use the POST `/stemweb/result` endpoint instead.
        (`accept_result`)
        """
        logger.debug(f"Polling Stemweb results for user {current_user.__dict__}")
        return success(status=200, body=dict(message='TODO'))

    def accept_result():
        """
        Handler catching incoming POST requests to `/stemweb/result`.
        Only the Stemweb API is allowed to call this endpoint to POST its results.
        Clients should use the GET `/stemweb/result` endpoint instead.
        (`poll_results`)
        """
        logger.debug("Processing result obtained from Stemweb")
        body_or_error = try_parse_model(models.StemwebJobResult, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        job_result: models.StemwebJobResult = body_or_error
        return success(status=200, body=job_result)

    @blueprint.route(f"/{ROUTE_PREFIX}/result", methods=["GET", "POST"])
    def results():
        """
        Handler catching incoming requests to `/stemweb/result`.
        After permission checks, the request is forwarded to the Stemweb API.

        :return: a Flask response.
        """
        if request.method == "GET":
            return poll_results()
        elif request.method == "POST":
            return accept_result()

    @blueprint.route(f"/{ROUTE_PREFIX}/<path:segments>", methods=ALLOWED_METHODS)
    def wildcard(segments: str):
        """
        Handler catching incoming requests to `/stemweb/*`.
        After permission checks, the request is forwarded to the Stemmarest API.

        :param segments: the path segments after `/stemweb/`.
        :return: a Flask response.
        """
        return handle_passthrough_request(
            client=stemweb_client,
            permission_handler=permission_handler,
            segments=segments,
        )

    return blueprint
