"""Settings passed to the Flask app instance in the app factory."""
from environs import Env

from stemmaweb_middleware.stemmarest.stemmarest_client import StemmarestClient
from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints

env = Env()
env.read_env()

ENV = env.str("FLASK_ENV", default="production")
DEBUG = ENV == "development"

# Used for Stemmarest Client setup
STEMMAREST_ENDPOINT = env.str(
    "STEMMAREST_ENDPOINT", default="http://localhost:8080/stemmarest"
)
STEMMAREST_CLIENT = StemmarestClient(endpoint=STEMMAREST_ENDPOINT)

# Endpoints redirected from this host (`STEMMAWEB_HOST`)
# to the stemmarest server (`STEMMAREST_ENDPOINT`)
STEMMAWEB_HOST = env.str("STEMMAWEB_HOST", default="http://localhost:3000")
STEMMAWEB_API_ENDPOINTS = StemmarestEndpoints(server_name=STEMMAWEB_HOST)

# Used for JWT-based authentication
JWT_SECRET_KEY = env.str("JWT_SECRET_KEY")

# Used for Google OAuth
GOOGLE_CLIENT_ID = env.str("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = env.str("GOOGLE_CLIENT_SECRET")
