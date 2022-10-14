import requests

from ..utils import url_is_valid
from .stemmarest_endpoints import StemmarestEndpoint


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


class StemmarestClient:
    """Class to make requests to the Stemmarest API"""

    def __init__(self, endpoint: str):
        """
        Initialize a `StemmarestClient` object.

        :param endpoint: The URL of the Stemmarest API endpoint used for requests.
        """
        if not url_is_valid(endpoint):
            raise ValueError(f"Invalid Stemmarest endpoint URL: {endpoint}")

        self.endpoint = endpoint

    def request(self, method: str, path: str, **kwargs) -> requests.Response:
        """
        Make a request to the Stemmarest API.

        :param method: The HTTP method to use.
        :param path: The path to the resource to request.
        :param kwargs: Additional keyword arguments to pass to `requests.request`.
        :return: A `requests.Response` object.
        """
        url = f"{self.endpoint}{path}"
        return requests.request(method, url, **kwargs)

    def typed_request(
        self,
        method: str,
        endpoint: StemmarestEndpoint,
        path_params: dict[str, str],
        **kwargs,
    ) -> requests.Response:
        """
        Make a request to the Stemmarest API with a typed endpoint.

        :param method: The HTTP method to use.
        :param endpoint: The endpoint to request.
        :param path_params: The parameters to use for endpoint expansion.
        :param kwargs: Additional keyword arguments to pass to `requests.request`.
        :return: A `requests.Response` object.
        """
        endpoint_str = str(endpoint.value)
        expanded_endpoint = _expand_endpoint_pattern(endpoint_str, path_params)
        return self.request(method, expanded_endpoint, **kwargs)
