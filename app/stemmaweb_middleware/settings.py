"""Settings passed to the Flask app instance in the app factory."""
from environs import Env

env = Env()
env.read_env()

ENV = env.str("FLASK_ENV", default="production")
DEBUG = ENV == "development"
STEMMAREST_ENDPOINT = env.str("STEMMAREST_ENDPOINT", default='http://localhost:8080/stemmarest')
