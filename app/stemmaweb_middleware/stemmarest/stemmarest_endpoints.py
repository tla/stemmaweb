from enum import Enum

from werkzeug.routing import Map, Rule


class StemmarestEndpoint(Enum):
    """Enum class to represent Stemmarest API endpoints."""

    TRADITIONS = "/traditions"
    TRADITION = "/tradition/{tradId}"
    USERS = "/users"
    USER = "/user/{userId}"
    READING = "/reading/{readingId}"


def nested_url_rule(level: int, endpoint="global_wildcard") -> Rule:
    endpoint_name = f"{endpoint}_{level}"
    segments = [f"<s{i}>" for i in range(1, level + 1)]
    return Rule("/" + "/".join(segments), endpoint=endpoint_name)


class StemmarestEndpoints:
    def __init__(self, server_name: str):
        # URL Rules to catch requests up to a nesting level of 4
        # E.g.: /seg1/seg2/seg3/seg4
        self.rules = [nested_url_rule(i) for i in range(1, 4 + 1)]
        self.urls = Map(self.rules).bind(server_name)
