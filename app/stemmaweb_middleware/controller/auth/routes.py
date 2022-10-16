import json

from flask import Blueprint, request
from flask.wrappers import Response

from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.utils import try_parse_model

from . import models
from . import service as auth_service


def blueprint_factory(stemmarest_client: StemmarestClient) -> Blueprint:
    blueprint = Blueprint("auth", __name__)
    service = auth_service.StemmarestAuthService(stemmarest_client)

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

        return Response(
            response=user_or_none.json(),
            status=200,
            mimetype="application/json",
        )

    return blueprint
