from flask import Flask

from . import controller


def create_app(config_object="stemmaweb_middleware.settings"):
    """
    Create application factory, as explained here:
    https://flask.pocoo.org/docs/patterns/appfactories/.

    :param config_object: The configuration object to use.
    """
    app = Flask(__name__.split(".")[0])
    app.config.from_object(config_object)
    register_blueprints(app)
    return app


def register_blueprints(app: Flask):
    """
    Register Flask blueprints.

    :param app: The Flask application object.
    """
    app.register_blueprint(controller.public.routes.blueprint)
    api_endpoints = app.config["STEMMAWEB_API_ENDPOINTS"]
    stemmarest_client = app.config["STEMMAREST_CLIENT"]
    app.register_blueprint(
        controller.api.routes.blueprint_factory(api_endpoints, stemmarest_client)
    )
    return None
