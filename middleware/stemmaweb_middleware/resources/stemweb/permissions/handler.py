from stemmaweb_middleware.permissions.base_handler import BasePermissionHandler
from stemmaweb_middleware.permissions.models import PermissionProvider
from stemmaweb_middleware.resources.base.api_client import APIClient

from ..permissions.declarations import StemwebPermissionProvider
from ..stemweb_endpoints import StemwebEndpoint
from .service import StemwebPermissionService


class StemwebPermissionHandler(BasePermissionHandler[StemwebEndpoint]):
    def __init__(self, provider: PermissionProvider[StemwebEndpoint]):
        super().__init__(provider, "Stemweb")


def get_stemweb_permission_handler(
    client: APIClient,
) -> StemwebPermissionHandler:
    """
        Creates a new Stemweb permission handler
        via chained dependency injection.

        The supplied ``client`` is used to create a ``StemwebPermissionService``.
        The ``StemwebPermissionService`` is used
        to create a ``StemwebPermissionProvider``.
        The ``StemwebPermissionProvider`` is used
        to create the ``StemwebPermissionHandler``.

        :param client: The ``APIClient`` to use.
        :return: The new ``StemwebPermissionHandler``.
        """
    service = StemwebPermissionService(client)
    provider = StemwebPermissionProvider(service)
    handler = StemwebPermissionHandler(provider)
    return handler
