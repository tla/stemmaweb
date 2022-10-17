import pydantic

from stemmaweb_middleware.models import StemmawebUser

RegisterUserDTO = StemmawebUser


class LoginUserDTO(pydantic.BaseModel):
    """Data Transfer Object for logging in a user."""

    id: str
    passphrase: str


class GoogleUserInfo(pydantic.BaseModel):
    """
    Model to represent the user info accessible
    after a successful Google login.
    """

    id_token: str
    email: str
    name: str
