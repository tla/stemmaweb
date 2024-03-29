import requests
from loguru import logger

from stemmaweb_middleware.utils import url_is_valid


def _expand_endpoint_pattern(endpoint_str: str, path_params: dict[str, str]) -> str:
    """
    Expand a templated endpoint pattern with the given parameters.
    :param endpoint_str: The endpoint pattern to expand.
    :param path_params: The parameters to use for expansion.
    :return: The expanded endpoint pattern.
    """
    for key, value in path_params.items():
        endpoint_str = endpoint_str.replace("{" + key + "}", value)
    # Raise error if not all parameters were used
    if "{" in endpoint_str:
        raise ValueError("Not all parameters were used for endpoint expansion.")
    return endpoint_str


class APIClient:
    """Class to make requests to an external API"""

    def __init__(self, endpoint: str, name: str):
        """
        Initialize an `APIClient` object.

        :param endpoint: The URL of the API endpoint used for requests.
        :param name: The name of the contacted API. Will appear in logs.
        """
        if not url_is_valid(endpoint):
            raise ValueError(f"Invalid {name} endpoint URL: {endpoint}")

        self.endpoint = endpoint
        self.name = name

    def request(self, method: str, path: str, **kwargs) -> requests.Response:
        """
        Make a request to the API.

        :param method: The HTTP method to use.
        :param path: The path to the resource to request.
        :param kwargs: Additional keyword arguments to pass to `requests.request`.
        :return: A `requests.Response` object.
        """
        url = f"{self.endpoint}{path}"
        logger.debug(f"Making {self.name} call: {url}")
        return requests.request(method, url, **kwargs)
