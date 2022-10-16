from enum import Enum

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
