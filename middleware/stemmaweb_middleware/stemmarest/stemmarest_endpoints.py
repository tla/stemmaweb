from enum import Enum
from typing import Optional


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
