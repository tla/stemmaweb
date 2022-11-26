import pydantic

from stemmaweb_middleware.models import EmailStr, StemmawebUser, UserRoleStr


class AuthDTO(pydantic.BaseModel):
    """Base class for all auth DTOs."""
    recaptcha_token: str


class RegisterUserDTO(AuthDTO):
    """Data Transfer Object for registering a new user."""
    passphrase: str
    role: UserRoleStr  # type: ignore
    id: str
    active: bool = False
    email: EmailStr  # type: ignore

    def to_stemmaweb_user(self) -> StemmawebUser:
        return StemmawebUser(
            id=self.id,
            email=self.email,
            passphrase=self.passphrase,
            role=self.role,
            active=self.active,
        )


class LoginUserDTO(AuthDTO):
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
