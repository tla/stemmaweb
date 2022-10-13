from flask import Flask

from . import public


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
    app.register_blueprint(public.views.blueprint)
    return None
