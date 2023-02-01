from stemmaweb_middleware.resources.base import APIClient


class StemwebPermissionService:
    """
    Helper functions for the permissions routes.
    Hides low-level details of the Stemweb API from the routes.
    """

    def __init__(self, client: APIClient):
        """
        Creates a new service object.

        :param client: The API client to use.
        """
        self.client = client
