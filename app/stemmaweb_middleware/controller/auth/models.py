import pydantic

from stemmaweb_middleware.models import StemmawebUser

RegisterUserDTO = StemmawebUser


class LoginUserDTO(pydantic.BaseModel):
    """Data Transfer Object for logging in a user."""

    id: str
    passphrase: str
