from enum import Enum
from typing import Optional

from werkzeug.routing import Map, Rule


class StemmarestEndpoint(Enum):
    """Enum class to represent Stemmarest API endpoints."""

    TRADITIONS = "/traditions"
    TRADITION = "/tradition/{tradId}"
    USERS = "/users"
    USER = "/user/{userId}"
    READING = "/reading/{readingId}"

    @staticmethod
    def match(path: str) -> Optional["StemmarestEndpoint"]:
        """
        Matches an actual string path to a `StemmarestEndpoint`.
        Partial matches are also supported meaning
        that if the path is a prefix of a `StemmarestEndpoint`'s path,
        the `StemmarestEndpoint` is returned.

        For example, the path "/tradition/123" matches
        the `StemmarestEndpoint` `TRADITION = "/tradition/{tradId}"`.

        :param path: The path to match.
        :return: The corresponding `StemmarestEndpoint`.
        """
        for endpoint in StemmarestEndpoint:
            first_segment = endpoint.value.split("/")[1]
            if path.startswith(f"/{first_segment}"):
                return endpoint
        return None


def nested_url_rule(level: int, endpoint="global_wildcard") -> Rule:
    endpoint_name = f"{endpoint}_{level}"
    segments = [f"<s{i}>" for i in range(1, level + 1)]
    return Rule("/" + "/".join(segments), endpoint=endpoint_name)


class StemmarestEndpoints:
    def __init__(self, server_name: str):
        # URL Rules to catch requests up to a nesting level of 10
        # E.g.: /seg1/seg2/seg3/seg4/seg5/seg6/seg7/seg8/seg9/seg10
        self.rules = [nested_url_rule(i) for i in range(1, 10 + 1)]
        self.urls = Map(self.rules).bind(server_name)
