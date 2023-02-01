from enum import Enum
from typing import Optional

from stemmaweb_middleware.utils import match_path


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
        endpoints = [endpoint.value for endpoint in StemmarestEndpoint]
        matched_endpoint = match_path(path, endpoints)
        if matched_endpoint is None:
            return None
        return StemmarestEndpoint(matched_endpoint)
