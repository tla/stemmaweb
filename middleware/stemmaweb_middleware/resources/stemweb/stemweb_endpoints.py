from enum import Enum
from typing import Optional

from loguru import logger

from stemmaweb_middleware.utils import match_path


class StemwebEndpoint(Enum):
    """
    Enum class to represent Stemmarest API endpoints.

    `Read more about the API
    <https://stemmaweb.net/?p=58>`_

    `See all Stemweb endpoints
    <https://github.com/tla/stemmaweb/issues/103#issuecomment-1416056239>`_
    """

    DISCOVERY = "/algorithms/available"
    CALCULATE = "/algorithms/process/{algo_id}"
    JOB_STATUS = "/algorithms/jobstatus/{run_id}"
    RESULT = "/stemweb/result"

    @staticmethod
    def match(path: str) -> Optional["StemwebEndpoint"]:
        """
        Matches an actual string path to a `StemwebEndpoint`.
        Partial matches are also supported meaning
        that if the path is a prefix of a `StemwebEndpoint`'s path,
        the `StemwebEndpoint` is returned.

        For example, the path "/tradition/123" matches
        the `StemwebEndpoint` `TRADITION = "/tradition/{tradId}"`.

        :param path: The path to match.
        :return: The corresponding `StemwebEndpoint`.
        """
        endpoints = [endpoint.value for endpoint in StemwebEndpoint]
        matched_endpoint = match_path(path, endpoints)
        logger.debug(
            f"[Stemweb] Matched path `{path}` to endpoint `{matched_endpoint}`"
        )
        if matched_endpoint is None:
            return None
        return StemwebEndpoint(matched_endpoint)
