from flask import Blueprint, current_app

from stemmaweb_middleware.resources.base import APIClient


def blueprint_factory(
    *, stemmarest_client: APIClient, stemweb_client: APIClient
) -> Blueprint:
    blueprint = Blueprint("health", __name__)

    @blueprint.route("/health")
    def health_check():
        return "Middleware is healthy", 200

    @blueprint.route("/stemmarest-health")
    def stemmarest_health_check():
        response = stemmarest_client.request("GET", "/")
        if response.ok:
            return "Stemmarest is healthy", 200
        else:
            return "Stemmarest is unhealthy", 500

    @blueprint.route("/stemweb-health")
    def stemweb_health_check():
        response = stemweb_client.request("GET", "/algorithms/available/")
        if response.ok:
            return "Stemweb is healthy", 200
        else:
            return "Stemweb is unhealthy", 500

    @blueprint.route("/") # Static file service
    def stemmaweb_index():
        return current_app.send_static_file('index.html')

    return blueprint
