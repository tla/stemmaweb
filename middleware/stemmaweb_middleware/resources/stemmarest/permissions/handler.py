from stemmaweb_middleware.permissions.base_handler import BasePermissionHandler
from stemmaweb_middleware.permissions.models import PermissionProvider
from stemmaweb_middleware.resources.base.api_client import APIClient

from ..permissions.declarations import StemmarestPermissionProvider
from ..stemmarest_endpoints import StemmarestEndpoint
from .service import StemmarestPermissionService


class StemmarestPermissionHandler(BasePermissionHandler[StemmarestEndpoint]):
    def __init__(self, provider: PermissionProvider[StemmarestEndpoint]):
        super().__init__(provider, "Stemmarest")


def get_stemmarest_permission_handler(
    client: APIClient,
) -> StemmarestPermissionHandler:
    """
    Creates a new Stemmarest permission handler
    via chained dependency injection.

    The supplied ``client`` is used to create a ``StemmarestPermissionService``.
    The ``StemmarestPermissionService`` is used
    to create a ``StemmarestPermissionProvider``.
    The ``StemmarestPermissionProvider`` is used
    to create the ``StemmarestPermissionHandler``.

    :param client: The ``APIClient`` to use.
    :return: The new ``StemmarestPermissionHandler``.
    """
    service = StemmarestPermissionService(client)
    provider = StemmarestPermissionProvider(service)
    handler = StemmarestPermissionHandler(provider)
    return handler
