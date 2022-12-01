from abc import ABC, abstractmethod
from typing import Protocol

import pydantic

from stemmaweb_middleware.models import EmailStr, StemmawebUser, UserRoleStr


class StemmawebUserSource(ABC):
    @abstractmethod
    def to_stemmaweb_user(self) -> StemmawebUser:
        pass


class UserGetter(Protocol):
    def __call__(self, *args) -> StemmawebUser | StemmawebUserSource:
        raise NotImplementedError


class AuthDTO(pydantic.BaseModel):
    """Base class for all auth DTOs."""

    recaptcha_token: str


class RegisterUserDTO(StemmawebUserSource, AuthDTO):
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


class GoogleUserInfo(StemmawebUserSource, pydantic.BaseModel):
    """
    Model to represent the user info accessible
    after a successful Google login.
    """

    sub: str
    email: EmailStr

    def to_stemmaweb_user(self) -> StemmawebUser:
        return StemmawebUser(
            id=self.sub,
            email=self.email,
            # Using user id as we will never actually need a password
            passphrase=self.sub,
            role="user",
            active=True,
        )


class GitHubUserInfo(StemmawebUserSource, pydantic.BaseModel):
    """
    Model to represent the user info accessible
    after a successful GitHub login.
    """

    login: str
    email: EmailStr

    def to_stemmaweb_user(self) -> StemmawebUser:
        return StemmawebUser(
            id=self.login,
            email=self.email,
            # Using user id as we will never actually need a password
            passphrase=self.login,
            role="user",
            active=True,
        )
