import flask_login
from flask import Blueprint, current_app, redirect, request, url_for
from flask.wrappers import Response
from loguru import logger

import stemmaweb_middleware.permissions as permissions
from stemmaweb_middleware.extensions import login_manager, oauth
from stemmaweb_middleware.models import AuthUser, StemmawebUser
from stemmaweb_middleware.stemmarest import StemmarestClient
from stemmaweb_middleware.utils import abort, success, try_parse_model

from . import models
from . import service as auth_service


def blueprint_factory(stemmarest_client: StemmarestClient) -> Blueprint:
    blueprint = Blueprint("auth", __name__)
    service = auth_service.StemmarestAuthService(stemmarest_client)

    @login_manager.user_loader
    def load_user_from_request(user_id: str) -> AuthUser | None:
        """
        Load a user object from the Stemmarest API
        based on the user ID stored in the session.

        :param user_id: The ID of the user to load, sourced from the Flask session
                        created after a successful login through `/login`.
        """
        user_or_none = service.load_user(user_id)
        if user_or_none is None:
            logger.debug(f"User {user_id} not found.")
            return None
        stemmaweb_user: StemmawebUser = user_or_none
        logger.debug(f"User loaded from request: {stemmaweb_user.id}")
        return AuthUser(stemmaweb_user)

    @blueprint.route("/protected", methods=["GET"])
    @permissions.require_min_user_role(permissions.UserRole.USER)
    def protected():
        auth_user = flask_login.current_user
        if auth_user is None:
            return abort(status=401, message="No auth user")
        return success(status=200, body=dict(message="Hello, world!"))

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

    @blueprint.route("/login", methods=["GET", "POST"])
    def login():
        # Check if query param says we should use Google login
        if request.args.get("method", "").lower() == "google":
            return google_login()

        body_or_error = try_parse_model(models.LoginUserDTO, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        body: models.LoginUserDTO = body_or_error
        user_or_none = service.user_credentials_valid(body)
        if user_or_none is None:
            return abort(status=401, message="Invalid credentials or no such user")

        # Login user for this flask session
        user: StemmawebUser = user_or_none
        auth_user = AuthUser(user)
        flask_login.login_user(auth_user)

        return success(status=200, body=user)

    @blueprint.route("/google-login")
    def google_login():
        redirect_uri = url_for(
            f"{blueprint.name}.google_oauth_redirect", _external=True
        )
        return oauth.google.authorize_redirect(redirect_uri)

    def frontend_redirect(*, location: str = "/"):
        """
        Redirect to the frontend app.
        """
        frontend_url = current_app.config["STEMMAWEB_FRONTEND_URL"]
        return redirect(f"{frontend_url}{location}")

    @blueprint.route("/oauthcallback")
    def google_oauth_redirect():
        try:
            # Parse the OAuth response received from Google
            # See https://developers.google.com/identity/protocols/oauth2/openid-connect#an-id-tokens-payload # noqa: E501
            token = oauth.google.authorize_access_token()
            id_token = token["id_token"]
            access_token = token["access_token"]
            parsable_token = dict(id_token=id_token, access_token=access_token)
            nonce = token["userinfo"]["nonce"]
            user = oauth.google.parse_id_token(parsable_token, nonce)
            logger.debug(f"Google user authenticated: {user}")

            # Logging the user into a Flask Session
            # Using `sub` as the user ID, which is a unique identifier
            user_id = user["sub"]
            email = user["email"]
            user_or_none = service.load_user(user_id)
            if user_or_none is None:
                logger.debug(
                    f"It's the first time {email} logs in using Google. "
                    f"Creating user..."
                )
                new_user = models.StemmawebUser(
                    id=user_id,
                    email=email,
                    # Using `user_id` as we will never actually need a password
                    passphrase=user_id,
                    role="user",
                    active=True,
                )
                service.register_user(user=new_user)
                flask_login.login_user(AuthUser(new_user))
                # TODO: maybe redirect to dedicated `/success` page
                return frontend_redirect()

            # Otherwise, we just log the user in as it cannot be `None`
            user_to_log_in: models.StemmawebUser = user_or_none
            flask_login.login_user(AuthUser(user_to_log_in))
            logger.debug(f"User logged in: {user_to_log_in}")
            # TODO: maybe redirect to dedicated `/success` page
            return frontend_redirect()
        except Exception as e:
            logger.error(f"Error while logging in with Google: {e}")
            flask_login.logout_user()
            # TODO: maybe redirect to dedicated `/failure` page
            return frontend_redirect()

    return blueprint
