import flask_login
import pydantic

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

    def __init__(self, data: StemmawebUser):
        """
        Creates a new `AuthUser`. This is the user object returned to the client.

        :param data: The `StemmawebUser` to wrap.
        """
        super().__init__()
        data.passphrase = "********" # Never pass the passphrase back to the client
        self.data = data
        self.id = data.id


# Possible types for `flask_login.current_user`
CurrentUser = flask_login.AnonymousUserMixin | AuthUser | None
