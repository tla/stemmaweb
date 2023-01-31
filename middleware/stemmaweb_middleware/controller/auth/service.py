import requests
from authlib.integrations.flask_client import OAuth

import stemmaweb_middleware.constants as constants
from stemmaweb_middleware.models import StemmawebUser
from stemmaweb_middleware.stemmarest import APIClient

from . import models


class StemmarestAuthService:
    """
    Business logic for the auth routes.
    Hides low-level details of the Stemmarest API from the routes.
    """

    def __init__(self, client: APIClient):
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

        # Using `sub` as the user ID, which is a unique identifier
        user_id = user["sub"]
        email = user["email"]

        # Checking if the user exists
        user_or_none = self.load_user(user_id)
        if user_or_none is None:
            return models.GoogleUserInfo(
                sub=user_id,
                email=email,
            )
        return user_or_none

    def load_user_github_oauth(
        self, oauth: OAuth, code: str, state: str, client_id: str, client_secret: str
    ) -> StemmawebUser | models.GitHubUserInfo:
        """
        Loads a user by interacting with the GitHub OAuth API.

        :param oauth: The pre-configured OAuth object to use
        :param code: The temporary code received from GitHub,
                     to be exchanged for an access token
        :param state: The state parameter received from GitHub,
                      should be checked to prevent CSRF
        :param client_id: The client ID of the GitHub OAuth app
        :param client_secret: The client secret of the GitHub OAuth app
        :return: A `StemmawebUser` object if the user exists,
                 a `models.GitHubUserInfo` object otherwise.
        """
        # Conduct flow as described in https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow # noqa: E501
        access_token = self.__exchange_gh_code_for_access_token(
            code, client_id, client_secret
        )
        user_login = self.__get_gh_user_login(access_token)
        user_email = self.__get_gh_user_email(access_token)
        user_or_none = self.load_user(user_login)
        if user_or_none is None:
            return models.GitHubUserInfo(login=user_login, email=user_email)  # type: ignore  # noqa: E501
        return user_or_none

    @staticmethod
    def __exchange_gh_code_for_access_token(
        code: str, client_id: str, client_secret: str
    ) -> str:
        data = dict(code=code, client_id=client_id, client_secret=client_secret)
        url = constants.GITHUB_API_ACCESS_TOKEN_URL
        headers = {"Accept": "application/json"}
        response = requests.post(url, data=data, headers=headers)
        return response.json()["access_token"]

    @staticmethod
    def __get_gh_user_login(access_token: str) -> str:
        """
        Get the login name of the GitHub user with the given access token.

        .. code-block::

            {
                "login": "...",
                "id": 123456,
                "node_id": "...",
                "avatar_url": "...",
                "gravatar_id": "...",
                "url": "...",
                "html_url": "...",
                "followers_url": "...",
                "following_url": "...",
                "gists_url": "...",
                "starred_url": "...",
                "subscriptions_url": "...",
                "organizations_url": "...",
                "repos_url": "...",
                "events_url": "...",
                "received_events_url": "...",
                "type": "...",
                "site_admin": false,
                "name": "...",
                "company": "...",
                "blog": "...",
                "location": "...",
                "email": null,
                "hireable": null,
                "bio": "...",
                "twitter_username": "...",
                "public_repos": 106,
                "public_gists": 4,
                "followers": 19,
                "following": 77,
                "created_at": "...",
                "updated_at": "...Z"
            }

        :param access_token: The access token to use
                             to authenticate with the GitHub API.
        :return: The login name of the GitHub user.
        """
        url = constants.GITHUB_API_USER_URL
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(url, headers=headers)
        return response.json()["login"]

    @staticmethod
    def __get_gh_user_email(access_token: str) -> str:
        """
        Get the user's primary email address from the GitHub API.

        Example API response:

        .. code-block::

            [
                {
                    "email": "123456+username@users.noreply.github.com",
                    "primary": false,
                    "verified": true,
                    "visibility": null
                },
                {
                    "email": "some.one@domain.com",
                    "primary": true,
                    "verified": true,
                    "visibility": "private"
                },
                {
                    "email": "someother@alternativedomain.at",
                    "primary": false,
                    "verified": true,
                    "visibility": null
                }
            ]

        :param access_token: The access token to use
                             to authenticate with the GitHub API.
        :return: The user's primary email address.
        """
        url = constants.GITHUB_API_USER_EMAILS_URL
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(url, headers=headers)
        emails: list[dict] = response.json()

        def predicate(email: dict) -> bool:
            return email["primary"]

        primary_email = next(filter(predicate, emails))
        return primary_email["email"]
