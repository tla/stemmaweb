import requests

from stemmaweb_middleware.models import StemmawebUser
from stemmaweb_middleware.stemmarest import StemmarestClient

from . import models


class StemmarestAuthService:
    """
    Business logic for the auth routes.
    Hides low-level details of the Stemmarest API from the routes.
    """

    def __init__(self, client: StemmarestClient):
        """
        Creates a new service object for the auth routes.

        :param client: The Stemmarest client to use.
        """
        self.client = client

    def register_user(self, user: models.RegisterUserDTO) -> requests.Response:
        """
        Register a new user via the Stemmarest API.

        :param user: The user to register.
        :return: A `requests.Response` object from the Stemmarest API.
        """
        return self.client.request(
            method="PUT",
            path=f"/user/{user.id}",
            json=user.dict(),
            headers={"Content-Type": "application/json"},
        )

    def user_credentials_valid(
        self, credentials: models.LoginUserDTO
    ) -> StemmawebUser | None:
        """
        Check if the given user credentials are valid. If so, return the user object.

        :param credentials: Credentials to check.
        :return: The user object if the credentials are valid, `None` otherwise.
        """
        response = self.client.request(
            method="GET",
            path=f"/user/{credentials.id}",
        )
        no_such_user = response.status_code == 204
        if no_such_user:
            return None
        user_from_response = StemmawebUser.parse_raw(response.content)
        passwords_match = user_from_response.passphrase == credentials.passphrase
        return user_from_response if passwords_match else None
