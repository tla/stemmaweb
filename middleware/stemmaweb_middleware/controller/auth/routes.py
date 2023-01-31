import flask_login
from flask import Blueprint, current_app, redirect, request
from flask.wrappers import Response
from loguru import logger

import stemmaweb_middleware.permissions as permissions
from stemmaweb_middleware.extensions import login_manager, oauth
from stemmaweb_middleware.models import AuthUser, StemmawebUser
from stemmaweb_middleware.stemmarest import APIClient
from stemmaweb_middleware.utils import (
    RecaptchaVerifier,
    abort,
    success,
    try_parse_model,
)

from . import models
from . import service as auth_service


def blueprint_factory(
    stemmarest_client: APIClient, recaptcha_verifier: RecaptchaVerifier
) -> Blueprint:
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

    @blueprint.route("/user", methods=["GET"])
    def user():
        """
        Get the currently logged-in user, if any, based on the Flask session.
        :return:
        """
        if isinstance(flask_login.current_user, AuthUser):
            auth_user: AuthUser = flask_login.current_user
            return success(
                status=200, body=dict(user=auth_user.data.dict(exclude={"passphrase"}))
            )
        else:
            return success(status=200, body=dict(user=None))

    @blueprint.route("/register", methods=["POST"])
    def register():
        body_or_error = try_parse_model(models.RegisterUserDTO, request)
        if isinstance(body_or_error, Response):
            return body_or_error

        body: models.RegisterUserDTO = body_or_error

        # Verify captcha
        if not recaptcha_verifier.verify(body.recaptcha_token):
            return abort(status=429, message="reCAPTCHA verification failed")

        response = service.register_user(body.to_stemmaweb_user())
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
            return abort(status=401, message="Invalid credentials or no such user")

        # Verify captcha
        if not recaptcha_verifier.verify(body.recaptcha_token):
            return abort(status=429, message="reCAPTCHA verification failed")

        # Login user for this flask session
        user: StemmawebUser = user_or_none
        auth_user = AuthUser(user)
        flask_login.login_user(auth_user)

        return success(status=200, body=user)

    @blueprint.route("/logout", methods=["GET"])
    def logout():
        flask_login.logout_user()
        return success(status=200, body=dict(message="Logged out"))

    def frontend_redirect(*, location: str = "/"):
        """
        Redirect to the frontend app.
        """
        frontend_url = current_app.config["STEMMAWEB_FRONTEND_URL"]
        redirect_uri = f"{frontend_url}{location}"
        if redirect_uri.endswith("//"):
            redirect_uri = redirect_uri[:-1]
        return redirect(redirect_uri)

    @blueprint.route("/oauth-google")
    def google_login():
        redirect_uri = (
            f"{current_app.config['STEMMAWEB_MIDDLEWARE_URL']}/oauthcallback-google"
        )
        return oauth.google.authorize_redirect(redirect_uri)

    def oauth_redirect(
        provider: str,
        user_getter: models.UserGetter,
        user_getter_args: tuple,
    ):
        """
        Higher-order function to handle OAuth redirects from distinct providers.
        The supplied `user_getter` function is used to retrieve
        an existing `StemmawebUser` loaded from the provider's API,
        or to create a new one from the data sourced from the provider.

        `user_getter_args` needs to be supplied so that the `user_getter`
        can be called with the correct arguments **inside** this function.
        This is needed so that a uniform error-handling flow can be implemented.

        :param provider: the name of the OAuth provider, used in logging
        :param user_getter: a function to retrieve a `StemmawebUser`
                            from the provider's API
        :param user_getter_args: the arguments to pass to `user_getter`
        :return: a Flask response
        """
        logger.debug(f"OAuth redirect for {provider} invoked...")
        try:
            user_or_user_source = user_getter(*user_getter_args)

            # Check whether the user already exists
            if isinstance(user_or_user_source, StemmawebUser):
                user_to_log_in: StemmawebUser = user_or_user_source
                flask_login.login_user(AuthUser(user_to_log_in))
                logger.debug(f"User logged in: {user_to_log_in}")
                # TODO: maybe redirect to dedicated `/success` page
                return frontend_redirect()

            # The user does not exist yet, so we need to register them
            user_source: models.StemmawebUserSource = user_or_user_source
            user_to_register = user_source.to_stemmaweb_user()
            logger.debug(
                f"User loaded from {provider} not found in Stemmarest, "
                f"registering: {user_to_register.email}"
            )
            service.register_user(user=user_to_register)

            # Log in the newly registered user
            flask_login.login_user(AuthUser(user_to_register))
            # TODO: maybe redirect to dedicated `/success` page
            return frontend_redirect()
        except Exception as e:
            logger.error(f"Error while logging in with {provider}: {e}")
            flask_login.logout_user()
            # TODO: maybe redirect to dedicated `/failure` page
            return frontend_redirect()

    @blueprint.route("/oauthcallback-google")
    def google_oauth_redirect():
        return oauth_redirect(
            provider="Google",
            user_getter=service.load_user_google_oauth,
            user_getter_args=(oauth,),
        )

    @blueprint.route("/oauth-github")
    def github_login():
        redirect_uri = (
            f"{current_app.config['STEMMAWEB_MIDDLEWARE_URL']}/oauthcallback-github"
        )
        # TODO: proper `state` parameter handling to prevent CSRF
        # See: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#parameters  # noqa: E501
        return oauth.github.authorize_redirect(
            redirect_uri, state="my-super-secret-state"
        )

    @blueprint.route("/oauthcallback-github")
    def github_oauth_redirect():
        code = request.args.get("code")
        state = request.args.get("state")
        return oauth_redirect(
            provider="GitHub",
            user_getter=service.load_user_github_oauth,
            user_getter_args=(
                oauth,
                code,
                state,
                current_app.config["GITHUB_CLIENT_ID"],
                current_app.config["GITHUB_CLIENT_SECRET"],
            ),
        )

    return blueprint
