"""Settings passed to the Flask app instance in the app factory."""
from environs import Env

from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints

env = Env()
env.read_env()

ENV = env.str("FLASK_ENV", default="production")
DEBUG = ENV == "development"

STEMMAREST_ENDPOINT = env.str(
    "STEMMAREST_ENDPOINT", default="http://localhost:8080/stemmarest"
)

STEMMAWEB_HOST = env.str("STEMMAWEB_HOST", default="http://localhost:3000")
# Endpoints redirected from this host (`STEMMAWEB_HOST`)
# to the stemmarest server (`STEMMAREST_ENDPOINT`)
STEMMAWEB_API_ENDPOINTS = StemmarestEndpoints(server_name=STEMMAWEB_HOST)
