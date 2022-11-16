"""Settings passed to the Flask app instance in the app factory."""
import secrets

from environs import Env

from stemmaweb_middleware.stemmarest.stemmarest_client import StemmarestClient
from stemmaweb_middleware.stemmarest.stemmarest_endpoints import StemmarestEndpoints

env = Env()
env.read_env()

ENV = env.str("FLASK_ENV", default="production")
DEBUG = ENV == "development"

# Used for Stemmarest Client setup
STEMMAREST_ENDPOINT = env.str(
    "STEMMAREST_ENDPOINT", default="http://127.0.0.1:8080/stemmarest"
)
STEMMAREST_CLIENT = StemmarestClient(endpoint=STEMMAREST_ENDPOINT)

# Endpoints redirected from this host (`STEMMAWEB_HOST`)
# to the stemmarest server (`STEMMAREST_ENDPOINT`)
STEMMAWEB_MIDDLEWARE_URL = env.str(
    "STEMMAWEB_MIDDLEWARE_URL", default="http://127.0.0.1:3000"
)
STEMMAWEB_API_ENDPOINTS = StemmarestEndpoints(middleware_url=STEMMAWEB_MIDDLEWARE_URL)

# Used for Flask-Login
# Session Docs: https://flask.palletsprojects.com/en/2.1.x/quickstart/#sessions
SECRET_KEY = env.str("SECRET_KEY", default=secrets.token_hex())

# Used for Google OAuth
STEMMAWEB_MIDDLEWARE_SERVER_NAME = STEMMAWEB_MIDDLEWARE_URL.split("://")[1]
GOOGLE_CLIENT_ID = env.str("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = env.str("GOOGLE_CLIENT_SECRET")
STEMMAWEB_FRONTEND_URL = env.str(
    "STEMMAWEB_FRONTEND_URL", default="http://127.0.0.1:5000"
)

# Logging
LOG_LEVEL = env.str("LOG_LEVEL", default="INFO")
LOGFILE = env.str("LOGFILE", default="stemmaweb_middleware.log")
LOG_BACKTRACE = env.bool("LOG_BACKTRACE", default=False)
