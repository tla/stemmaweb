from stemmaweb_middleware.stemmarest import StemmarestClient


class StemmarestPermissionService:
    """
    Helper functions for the permissions routes.
    Hides low-level details of the Stemmarest API from the routes.
    """

    def __init__(self, client: StemmarestClient):
        """
        Creates a new service object.

        :param client: The Stemmarest client to use.
        """
        self.client = client
