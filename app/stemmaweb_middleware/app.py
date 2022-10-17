import logging

from flask import Flask
from loguru import logger

from . import controller, extensions


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
    return app


def register_extensions(app: Flask):
    """
    Register Flask extensions.

    :param app: The Flask application object.
    """
    extensions.login_manager.init_app(app)
    return None


def register_blueprints(app: Flask):
    """
    Register Flask blueprints.

    :param app: The Flask application object.
    """
    # Public, server-side rendered HTML pages
    app.register_blueprint(controller.public.routes.blueprint)

    # Stemmarest API endpoints, hybrid permissions
    api_endpoints = app.config["STEMMAWEB_API_ENDPOINTS"]
    client = app.config["STEMMAREST_CLIENT"]
    api_blueprint = controller.api.routes.blueprint_factory(api_endpoints, client)
    app.register_blueprint(api_blueprint)

    # Middleware-API endpoints to handle auth
    auth_blueprint = controller.auth.routes.blueprint_factory(client)
    app.register_blueprint(auth_blueprint)
    return None


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
