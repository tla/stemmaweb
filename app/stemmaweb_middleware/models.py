from enum import Enum

import flask_login
import pydantic


class UserRole(Enum):
    """Enum class to represent user roles that influence permissions."""

    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


# Declarative model validation
EmailStr = pydantic.EmailStr
UserRoleStr = pydantic.constr(regex=r"^(admin|user)$")


class StemmawebUser(pydantic.BaseModel):
    """Represents a user of Stemmaweb."""

    passphrase: str
    role: UserRoleStr  # type: ignore
    id: str
    active: bool = False
    email: EmailStr  # type: ignore


class AuthUser(flask_login.UserMixin):
    """
    Wrapper around a `StemmawebUser` with auth-related
     properties needed by Flask-Login.
    """

    def __init__(self):
        super().__init__()
        self._data = None

    @property
    def data(self) -> StemmawebUser:
        """
        :return: the app-data of the user
        """
        try:
            return self._data
        except AttributeError:
            raise NotImplementedError("No `data` attribute - override `data`") from None

    @staticmethod
    def from_stemmaweb_user(stemmaweb_user: StemmawebUser) -> "AuthUser":
        """
        Constructs an `AuthUser` from a `StemmawebUser`.

        :param stemmaweb_user: the user data
        :return: an auth user
        """
        user = AuthUser()
        auth_user = AuthUser()
        setattr(auth_user, "id", stemmaweb_user.id)
        setattr(auth_user, "_data", user)
        return auth_user
