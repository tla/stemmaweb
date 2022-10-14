from enum import Enum


class UserRole(Enum):
    """Enum class to represent user roles that influence permissions."""

    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"
