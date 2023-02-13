from stemmaweb_middleware.resources.base.api_client import APIClient


class StemmarestService:
    """Service class to perform high-level operations on the Stemmarest API."""

    def __init__(self, client: APIClient):
        """
        Initialize a `StemmarestService` object.

        :param client: A `StemmarestClient` object to interact with the Stemmarest API.
        """
        self.client = client
