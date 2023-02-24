"""Settings passed to the Flask app instance in the app factory."""
import secrets

from environs import Env
from loguru import logger

from stemmaweb_middleware.resources.base import APIClient
from stemmaweb_middleware.utils import RecaptchaVerifier

from . import constants

env = Env()
env.read_env()

ENV = env.str("FLASK_ENV", default="production")
DEBUG = ENV == "development"
# In case we are serving the frontend from Flask, we set the static folder to some
# reasonable value such as 'stemmaweb' and serve it from the root path.
flask_args = {'static_folder': env.str("STEMMAWEB_STATIC", default=None), 
              'static_url_path': '/' if env.str('STEMMAWEB_STATIC') else None}

# Used for Stemmarest Client setup
STEMMAREST_ENDPOINT = env.str(
    "STEMMAREST_ENDPOINT", default="http://127.0.0.1:8080/stemmarest"
)
STEMMAREST_CLIENT = APIClient(endpoint=STEMMAREST_ENDPOINT, name="Stemmarest")

# Used for Stemweb Client setup
STEMWEB_ENDPOINT = env.str("STEMWEB_ENDPOINT", default="http://127.0.0.1:8000")
STEMWEB_CLIENT = APIClient(endpoint=STEMWEB_ENDPOINT, name="Stemweb")

# Endpoints redirected from this host (`STEMMAWEB_HOST`)
# to the stemmarest server (`STEMMAREST_ENDPOINT`)
STEMMAWEB_MIDDLEWARE_URL = env.str(
    "STEMMAWEB_MIDDLEWARE_URL", default=""
)

# Used for Flask-Login
# Session Docs: https://flask.palletsprojects.com/en/2.1.x/quickstart/#sessions
SECRET_KEY = env.str("SECRET_KEY", default=secrets.token_hex())

# Used for Google OAuth
GOOGLE_CLIENT_ID = env.str("GOOGLE_CLIENT_ID", None)
GOOGLE_CLIENT_SECRET = env.str("GOOGLE_CLIENT_SECRET", None)
STEMMAWEB_FRONTEND_URL = env.str(
    "STEMMAWEB_FRONTEND_URL", default=""
)

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    logger.warning(
        "Google OAuth not configured, login will not work. "
        "You can set the GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET "
        "environment variables to configure Google OAuth."
    )

GITHUB_CLIENT_ID = env.str("GITHUB_CLIENT_ID", None)
GITHUB_CLIENT_SECRET = env.str("GITHUB_CLIENT_SECRET", None)
if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
    logger.warning(
        "GitHub OAuth not configured, login will not work. "
        "You can set the GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET "
        "environment variables to configure GitHub OAuth."
    )

# Used for reCAPTCHA validation
RECAPTCHA_SECRET_KEY = env.str("RECAPTCHA_SECRET_KEY", None)
if not RECAPTCHA_SECRET_KEY:
    logger.warning(
        "reCAPTCHA not configured, auth operations will not work. "
        "You can set the RECAPTCHA_SECRET_KEY "
        "environment variable to configure reCAPTCHA."
    )
RECAPTCHA_VERIFIER = RecaptchaVerifier(
    secret=RECAPTCHA_SECRET_KEY,
    verification_url=constants.GOOGLE_RECAPTCHA_VERIFICATION_URL,
    threshold=constants.GOOGLE_RECAPTCHA_THRESHOLD,
)

# Logging
LOG_LEVEL = env.str("LOG_LEVEL", default="INFO")
LOGFILE = env.str("LOGFILE", default="stemmaweb_middleware.log")
LOG_BACKTRACE = env.bool("LOG_BACKTRACE", default=False)
