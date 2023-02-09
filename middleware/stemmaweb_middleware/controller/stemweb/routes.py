from flask import Blueprint, Response, request
from flask_login import current_user
from loguru import logger

from stemmaweb_middleware.permissions import UserRole, require_min_user_role
from stemmaweb_middleware.resources.base import APIClient, handle_passthrough_request
from stemmaweb_middleware.resources.stemweb.permissions import (
    get_stemweb_permission_handler,
)
from stemmaweb_middleware.utils import success, try_parse_model

from . import models
from .service import StemwebJobServiceBase


def blueprint_factory(
        stemweb_client: APIClient, stemweb_job_service: StemwebJobServiceBase
):
    """
    Creates a Flask blueprint to expose the Stemmarest API at `/stemweb/*`.

    :param stemweb_client: `APIClient` to interact with the Stemweb API.
    :param stemweb_job_service: service to manage job results
    :return: the configured Flask blueprint.
    """
    blueprint = Blueprint("stemweb", __name__)
    ALLOWED_METHODS = ["GET", "POST"]
    ROUTE_PREFIX = "/stemweb"
    permission_handler = get_stemweb_permission_handler(stemweb_client)
    # Route used by Stemweb to POST job results and by clients to GET job results
    RESULT_ROUTE = f"/{ROUTE_PREFIX}/result"

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

    @blueprint.get(RESULT_ROUTE)
    @require_min_user_role(UserRole.USER)
    def poll_results():
        """
        Handler catching incoming GET requests to `/stemweb/result`.
        Only authenticated clients are allowed to call this endpoint.
        The Stemweb API should use the POST `/stemweb/result` endpoint instead.
        (`accept_result`)
        """
        user_id: str = current_user.id
        logger.debug(f"Polling Stemweb results for user {user_id}")
        job_results = stemweb_job_service.get_job_results(user_id)
        body = models.StemwebJobResultPollResponse(results=job_results)
        return success(status=200, body=body)

    @blueprint.post(RESULT_ROUTE)
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
        user_id = job_result.userid
        logger.debug(f"Adding Stemweb result for user {user_id}")
        stemweb_job_service.add_job_result(user_id, job_result)

        return success(status=200)

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
