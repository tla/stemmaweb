from stemmaweb_middleware.resources.base.api_client import APIClient


class StemwebService:
    """Service class to perform high-level operations on the Stemweb API."""

    def __init__(self, client: APIClient):
        """
        Initialize a `Stemweb` object.

        :param client: An `APIClient` object to interact with the Stemweb API.
        """
        self.client = client
