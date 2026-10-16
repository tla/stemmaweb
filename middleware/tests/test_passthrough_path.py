"""Tests for the path a passthrough request is forwarded to.

The middleware must not rewrite the URL the caller used. A blanket trailing
slash used to be appended in the shared passthrough handler because Stemweb is
Django, which meant Stemmarest was given a URL it had never been asked for.
"""

import pytest
from flask import Flask
from flask_login import LoginManager, UserMixin, login_user

from stemmaweb_middleware.resources.base import handle_passthrough_request
from stemmaweb_middleware.resources.base.passthrough_handler import (
    build_api_endpoint,
)
from stemmaweb_middleware.resources.stemmarest.permissions import (
    get_stemmarest_permission_handler,
)


@pytest.mark.parametrize(
    "segments, force_trailing_slash, expected",
    [
        # By default the caller's URL is preserved, slash or no slash.
        ("tradition", False, "/tradition"),
        ("tradition/", False, "/tradition/"),
        ("tradition/abc", False, "/tradition/abc"),
        ("tradition/abc/", False, "/tradition/abc/"),
        ("tradition/abc/sections", False, "/tradition/abc/sections"),
        # A backend that requires one gets one...
        ("tradition", True, "/tradition/"),
        ("tradition/abc", True, "/tradition/abc/"),
        # ...but never two.
        ("tradition/", True, "/tradition/"),
        ("tradition/abc/", True, "/tradition/abc/"),
        # Empty segments are collapsed rather than producing double slashes.
        ("tradition//abc", False, "/tradition/abc"),
    ],
)
def test_build_api_endpoint(segments, force_trailing_slash, expected):
    assert (
        build_api_endpoint(segments, force_trailing_slash=force_trailing_slash)
        == expected
    )


class StubResponse:
    """Minimal stand-in for `requests.Response`."""

    def __init__(self, payload):
        self._payload = payload
        self.status_code = 200
        self.content = b"{}"
        self.text = str(payload)
        self.headers = {"Content-Type": "application/json"}

    def json(self):
        return self._payload


class StubClient:
    """Records the path of every request it is asked to make."""

    def __init__(self):
        self.paths = []

    def request(self, method, path, **kwargs):
        self.paths.append(path)
        return StubResponse({"ok": True})


class AdminUser(UserMixin):
    """An admin, so that permission checks never mask the path behaviour."""

    id = "admin@example.org"
    data = type("D", (), {"role": "admin", "id": "admin@example.org"})()


@pytest.fixture
def gateway():
    """Exposes the real passthrough handler over a stub backend, two ways."""
    app = Flask(__name__)
    app.secret_key = "test"
    login_manager = LoginManager(app)

    @login_manager.user_loader
    def load_user(user_id):
        return None

    @app.before_request
    def log_in_admin():
        login_user(AdminUser())

    client = StubClient()
    handler = get_stemmarest_permission_handler(client)

    @app.route("/api/<path:segments>", methods=["GET", "POST", "PUT", "DELETE"])
    def passthrough(segments):
        return handle_passthrough_request(
            client=client, permission_handler=handler, segments=segments
        )

    @app.route("/forced/<path:segments>", methods=["GET", "POST", "PUT", "DELETE"])
    def forced_passthrough(segments):
        return handle_passthrough_request(
            client=client,
            permission_handler=handler,
            segments=segments,
            force_trailing_slash=True,
        )

    return app.test_client(), client


@pytest.mark.parametrize(
    "url, expected_path",
    [
        # Stemmarest: forwarded exactly as addressed.
        ("/api/tradition", "/tradition"),
        ("/api/tradition/", "/tradition/"),
        ("/api/tradition/abc", "/tradition/abc"),
        ("/api/tradition/abc/sections", "/tradition/abc/sections"),
        # Stemweb (Django): a trailing slash is forced either way.
        ("/forced/tradition", "/tradition/"),
        ("/forced/tradition/abc", "/tradition/abc/"),
    ],
)
def test_forwarded_path(gateway, url, expected_path):
    http, client = gateway
    response = http.get(url)
    assert response.status_code == 200, response.data
    # The permission predicates make their own metadata lookups for item paths,
    # so the forwarded request is simply the last one the client was asked to
    # make.
    assert client.paths, "nothing was forwarded"
    assert client.paths[-1] == expected_path
