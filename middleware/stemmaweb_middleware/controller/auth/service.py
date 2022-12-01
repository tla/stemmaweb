import requests
from authlib.integrations.flask_client import OAuth

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

    def register_user(self, user: StemmawebUser) -> requests.Response:
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

    def load_user(self, user_id: str) -> StemmawebUser | None:
        """
        Load a user object from the Stemmarest API.

        :param user_id: The ID of the user to load.
        :return: The user object if it exists, `None` otherwise.
        """
        response = self.client.request(
            method="GET",
            path=f"/user/{user_id}",
        )
        no_such_user = response.status_code == 204
        return None if no_such_user else StemmawebUser.parse_raw(response.content)

    def user_credentials_valid(
        self, credentials: models.LoginUserDTO
    ) -> StemmawebUser | None:
        """
        Check if the given user credentials are valid. If so, return the user object.

        :param credentials: Credentials to check.
        :return: The user object if the credentials are valid, `None` otherwise.
        """
        user_or_none = self.load_user(credentials.id)
        if user_or_none is None:
            return None
        user_from_response: StemmawebUser = user_or_none
        passwords_match = user_from_response.passphrase == credentials.passphrase
        return user_from_response if passwords_match else None

    def load_user_google_oauth(
        self, oauth: OAuth
    ) -> StemmawebUser | models.GoogleUserInfo:
        """
        Loads a user by interacting with the Google OAuth API.
        If the user exists, a `StemmawebUser` object is returned,
        otherwise a `models.GoogleUserInfo` object
        which can be used to register the user.

        This must be called after `oauth.google.authorize_redirect` has been invoked.

        :param oauth: The pre-configured OAuth object to use
                      to interact with the Google OAuth API.
        :return: A `StemmawebUser` object if the user exists,
                 a `models.GoogleUserInfo` object otherwise.
        """
        # Parse the OAuth response received from Google
        # See https://developers.google.com/identity/protocols/oauth2/openid-connect#an-id-tokens-payload # noqa: E501
        token = oauth.google.authorize_access_token()
        id_token = token["id_token"]
        access_token = token["access_token"]
        parsable_token = dict(id_token=id_token, access_token=access_token)
        nonce = token["userinfo"]["nonce"]
        user = oauth.google.parse_id_token(parsable_token, nonce)

        # Logging the user into a Flask Session
        # Using `sub` as the user ID, which is a unique identifier
        user_id = user["sub"]
        email = user["email"]
        user_or_none = self.load_user(user_id)
        if user_or_none is None:
            return models.GoogleUserInfo(
                sub=user_id,
                email=email,
            )
        return user_or_none

    def load_user_github_oauth(
        self, oauth: OAuth, code: str, state: str
    ) -> StemmawebUser | models.GitHubUserInfo:
        pass
