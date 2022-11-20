from flask import Blueprint
from stemmaweb_middleware.stemmarest import StemmarestClient


def blueprint_factory(stemmarest_client: StemmarestClient) -> Blueprint:
    blueprint = Blueprint("health", __name__)

    @blueprint.route("/")
    def health_check():
        return "Middleware is healthy", 200

    @blueprint.route("/stemmarest-health")
    def stemmarest_health_check():
        response = stemmarest_client.request("GET", "/")
        if response.ok:
            return "Stemmarest is healthy", 200
        else:
            return "Stemmarest is unhealthy", 500

    return blueprint
