import logging

from flask import Flask
from loguru import logger

from . import constants, controller, extensions


def create_app(config_object="stemmaweb_middleware.settings"):
    """
    Create application factory, as explained here:
    https://flask.pocoo.org/docs/patterns/appfactories/.

    :param config_object: The configuration object to use.
    """
    app = Flask(__name__.split(".")[0])
    app.config.from_object(config_object)
    app.secret_key = app.config["SECRET_KEY"]

    register_logging(app)
    register_extensions(app)
    register_blueprints(app)
    register_default_headers(app)
    return app


def register_extensions(app: Flask):
    """
    Register Flask extensions.

    :param app: The Flask application object.
    """
    # Login manager to handle user sessions
    extensions.login_manager.init_app(app)

    # Authlib OAuth2 client
    extensions.oauth.init_app(app)
    extensions.oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url=constants.GOOGLE_DISCOVERY_URL,
        client_kwargs={"scope": "openid email profile"},
    )
    extensions.oauth.register(
        name="github",
        client_id=app.config["GITHUB_CLIENT_ID"],
        client_secret=app.config["GITHUB_CLIENT_SECRET"],
        authorize_url=constants.GITHUB_AUTHORIZATION_URL,
        client_kwargs={"scope": "user:email"},
    )

    # Flask-Cors to handle CORS
    extensions.cors.init_app(app)
    return None


def register_blueprints(app: Flask):
    """
    Register Flask blueprints.

    :param app: The Flask application object.
    """
    # Stemmarest API endpoints, hybrid permissions
    api_endpoints = app.config["STEMMAWEB_API_ENDPOINTS"]
    client = app.config["STEMMAREST_CLIENT"]
    api_blueprint = controller.api.routes.blueprint_factory(api_endpoints, client)
    app.register_blueprint(api_blueprint)

    # Middleware-API endpoints to handle auth
    recaptcha_verifier = app.config["RECAPTCHA_VERIFIER"]
    auth_blueprint = controller.auth.routes.blueprint_factory(
        client, recaptcha_verifier
    )
    app.register_blueprint(auth_blueprint)

    # General health-check endpoint
    health_blueprint = controller.health.routes.blueprint_factory(client)
    app.register_blueprint(health_blueprint)
    return None


def register_default_headers(app: Flask):
    """
    Register default headers for all responses.

    :param app: The Flask application object.
    """

    @app.after_request
    def set_default_headers(response):
        # Used to expose session cookies to the client browsers
        # See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials  # noqa: E501
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response


class InterceptHandler(logging.Handler):
    """
    Custom logging handler to intercept logs
    from Flask and redirect them to Loguru.
    """

    def emit(self, record):
        logger_opt = logger.opt(depth=6, exception=record.exc_info)
        logger_opt.log(record.levelno, record.getMessage())


def register_logging(app: Flask):
    """
    Register logging configuration.

    :param app: The Flask application object.
    """
    logger.start(
        app.config["LOGFILE"],
        level=app.config["LOG_LEVEL"],
        format="{time} {level} {message}",
        backtrace=app.config["LOG_BACKTRACE"],
        rotation="25 MB",
    )
    app.logger.addHandler(InterceptHandler())
    return None
