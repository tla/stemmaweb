import json

import flask_login
from flask import Blueprint, request
from flask.wrappers import Request, Response
from loguru import logger

import stemmaweb_middleware.permissions as permissions
from stemmaweb_middleware.extensions import login_manager
from stemmaweb_middleware.models import AuthUser, StemmawebUser
from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.utils import try_parse_model

from . import models
from . import service as auth_service


def blueprint_factory(stemmarest_client: StemmarestClient) -> Blueprint:
    blueprint = Blueprint("auth", __name__)
    service = auth_service.StemmarestAuthService(stemmarest_client)

    @login_manager.request_loader
    def load_user_from_request(req: Request) -> AuthUser | None:
        logger.info("Loading user from request")
        # Authorization: Basic <user_id> <passphrase>
        auth_header = req.headers.get("Authorization")
        if auth_header is None:
            logger.debug("No Authorization header")
            return None
        auth_type, user_id, passphrase = auth_header.split(" ")
        if auth_type != "Basic":
            logger.debug(f"Unsupported Authorization type: {auth_type}")
            return None
        user_or_none = service.user_credentials_valid(
            models.LoginUserDTO(id=user_id, passphrase=passphrase)
        )
        if user_or_none is None:
            logger.debug(f"Invalid credentials: {user_id}")
            return None

        stemmaweb_user: StemmawebUser = user_or_none
        logger.debug(f"User loaded from request: {stemmaweb_user.id}")
        return AuthUser(stemmaweb_user)

    @blueprint.route("/protected", methods=["GET"])
    @permissions.require_min_user_role(permissions.UserRole.USER)
    def protected():
        auth_user = flask_login.current_user
        if auth_user is None:
            return Response(status=401, response="No auth user")
        return Response(status=200, response=json.dumps(dict(message="Hello, world!")))

    @blueprint.route("/register", methods=["POST"])
    def register():
        body_or_error = try_parse_model(models.RegisterUserDTO, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        body: models.RegisterUserDTO = body_or_error
        response = service.register_user(body)
        return Response(
            response=response.content,
            status=response.status_code,
            mimetype=response.headers.get("Content-Type", None),
        )

    @blueprint.route("/login", methods=["POST"])
    def login():
        body_or_error = try_parse_model(models.LoginUserDTO, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        body: models.LoginUserDTO = body_or_error
        user_or_none = service.user_credentials_valid(body)
        if user_or_none is None:
            return Response(
                response=json.dumps(
                    dict(
                        code=401,
                        type="ERROR",
                        message="Invalid credentials or no such user",
                    )
                ),
                status=401,
                mimetype="application/json",
            )

        # Login user for this flask session
        user: StemmawebUser = user_or_none
        auth_user = AuthUser(user)
        flask_login.login_user(auth_user)

        return Response(
            response=user_or_none.json(),
            status=200,
            mimetype="application/json",
        )

    return blueprint
