"""Regression tests for the `/tradition/*` permission declarations.

These pin down the intended access matrix for `StemmarestEndpoint.TRADITION`,
which serves both the collection endpoint `/tradition` (creating a tradition)
and the item endpoint `/tradition/{tradId}`.

They also guard two crashes that came from predicates assuming a tradition id is
always present in the request path:

* `POST /tradition` (creating a tradition) used to raise `ValueError`
* an unknown tradition id used to raise `AttributeError` from the error-logging
  branch of `_get_tradition_info`
"""

import pytest
from werkzeug.datastructures import ImmutableMultiDict

from stemmaweb_middleware.permissions import UserRole
from stemmaweb_middleware.resources.stemmarest.permissions import (
    get_stemmarest_permission_handler,
)

TRADITIONS = {
    "public_owned": {"id": "public_owned", "is_public": True, "owner": "alice"},
    "private_owned": {"id": "private_owned", "is_public": False, "owner": "alice"},
    "public_other": {"id": "public_other", "is_public": True, "owner": "bob"},
    "private_other": {"id": "private_other", "is_public": False, "owner": "bob"},
}


class StubResponse:
    """Minimal stand-in for `requests.Response`."""

    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self):
        return self._payload


class StubStemmarestClient:
    """Stands in for `APIClient`, answering metadata lookups locally."""

    def __init__(self, known=None):
        self.known = TRADITIONS if known is None else known
        self.calls = []

    def request(self, method, path, **kwargs):
        self.calls.append((method, path))
        tradition_id = path.strip("/").split("/")[-1]
        if tradition_id in self.known:
            return StubResponse(self.known[tradition_id])
        return StubResponse({"error": "not found"}, status_code=404)


class StubUser:
    """Stands in for an authenticated `AuthUser`."""

    def __init__(self, user_id):
        self.id = user_id
        self.is_anonymous = False


ANONYMOUS = type("AnonymousUser", (), {"is_anonymous": True, "id": None})()

IDENTITIES = {
    "guest": (ANONYMOUS, UserRole.GUEST),
    "alice": (StubUser("alice"), UserRole.USER),
    "carol_admin": (StubUser("carol"), UserRole.ADMIN),
}


def check(client, identity, method, path_segments, data=None):
    """Runs the real permission handler for the given request shape."""
    user, role = IDENTITIES[identity]
    return get_stemmarest_permission_handler(client).check(
        {
            "method": method,
            "endpoint": "/api/" + "/".join(path_segments),
            "path_segments": tuple(path_segments),
            "query_params": {},
            "data": data,
            "headers": {},
            "user": user,
            "user_role": role,
        }
    )


# (identity, tradition id, method) -> may the request pass?
MATRIX = [
    # Guests may read public traditions only, and may never write.
    ("guest", "public_owned", "GET", True),
    ("guest", "public_owned", "POST", False),
    ("guest", "public_owned", "PUT", False),
    ("guest", "public_owned", "DELETE", False),
    ("guest", "private_owned", "GET", False),
    ("guest", "public_other", "GET", True),
    ("guest", "private_other", "GET", False),
    # A user may read public traditions and fully manage their own.
    ("alice", "public_owned", "GET", True),
    ("alice", "public_owned", "POST", True),
    ("alice", "public_owned", "PUT", True),
    ("alice", "public_owned", "DELETE", True),
    ("alice", "private_owned", "GET", True),
    ("alice", "private_owned", "DELETE", True),
    # ...but may only read a public tradition owned by somebody else.
    ("alice", "public_other", "GET", True),
    ("alice", "public_other", "PUT", False),
    ("alice", "public_other", "DELETE", False),
    # Other people's private traditions are invisible to a user.
    ("alice", "private_other", "GET", False),
    ("alice", "private_other", "PUT", False),
    # Admins may do anything with any tradition.
    ("carol_admin", "public_owned", "DELETE", True),
    ("carol_admin", "private_other", "GET", True),
    ("carol_admin", "private_other", "PUT", True),
    ("carol_admin", "private_other", "DELETE", True),
]


@pytest.mark.parametrize("identity, tradition_id, method, allowed", MATRIX)
def test_tradition_access_matrix(identity, tradition_id, method, allowed):
    result = check(
        StubStemmarestClient(), identity, method, ("tradition", tradition_id)
    )
    assert (method in result.allowed_http_methods) is allowed


@pytest.mark.parametrize(
    "identity, requested_owner, allowed",
    [
        # A guest may not create anything, whatever the body claims.
        ("guest", "alice", False),
        # A logged-in user may create a tradition they own...
        ("alice", "alice", True),
        # ...but may not create one attributed to somebody else. Stemmarest
        # takes the owner from the body and does not authenticate, so this
        # check is the only thing preventing that.
        ("alice", "bob", False),
        # A body that names no owner at all is refused rather than forwarded.
        ("alice", None, False),
        # Admins are trusted and bypass ownership checks throughout the policy,
        # so they may also create a tradition on another user's behalf. The
        # framework can only grant permissions, never subtract them, so this
        # exception is inherent to the admin rule rather than to this predicate.
        ("carol_admin", "carol", True),
        ("carol_admin", "alice", True),
    ],
)
def test_only_the_caller_can_own_a_new_tradition(identity, requested_owner, allowed):
    """A user must not be able to create a tradition attributed to someone else."""
    data = {} if requested_owner is None else {"userId": requested_owner}
    result = check(StubStemmarestClient(), identity, "POST", ("tradition",), data=data)
    assert ("POST" in result.allowed_http_methods) is allowed


def test_creation_accepts_the_real_multipart_form_shape():
    """A multipart upload puts an `ImmutableMultiDict` in `args["data"]`.

    This mirrors the payload of a real `POST /api/tradition` from the browser.
    """
    data = ImmutableMultiDict(
        [
            ("name", "something"),
            ("filetype", "xls"),
            ("userId", "alice"),
            ("direction", "LR"),
            ("public", "false"),
        ]
    )
    result = check(StubStemmarestClient(), "alice", "POST", ("tradition",), data=data)
    assert "POST" in result.allowed_http_methods


@pytest.mark.parametrize("method", ["GET", "PUT", "DELETE"])
def test_other_methods_on_the_collection_are_denied(method):
    """The collection endpoint only supports creation via POST.

    This is what stands in for a dedicated create-only permission: `WRITE` is
    granted by the create rule, so the predicate scoping it to POST is the
    guard.
    """
    data = {"userId": "alice"}
    result = check(StubStemmarestClient(), "alice", method, ("tradition",), data=data)
    assert result.allowed_http_methods == set()


def test_collection_path_does_not_trigger_a_metadata_lookup():
    """There is no tradition to inspect, so no backend call should be made."""
    client = StubStemmarestClient()
    check(client, "alice", "POST", ("tradition",), data={"userId": "alice"})
    assert client.calls == []


@pytest.mark.parametrize(
    "identity, allowed",
    # An admin bypasses the ownership checks entirely, so the request is simply
    # forwarded and Stemmarest answers 404 itself. For everyone else an unknown
    # tradition id is denied by the middleware.
    [("guest", False), ("alice", False), ("carol_admin", True)],
)
def test_unknown_tradition_is_handled_without_crashing(identity, allowed):
    result = check(StubStemmarestClient(), identity, "GET", ("tradition", "nope"))
    assert ("GET" in result.allowed_http_methods) is allowed


def test_backend_failure_is_denied_without_crashing():
    result = check(StubStemmarestClient(known={}), "alice", "GET", ("tradition", "t1"))
    assert result.allowed_http_methods == set()


class ExplodingClient:
    """A client whose backend is unreachable."""

    def request(self, method, path, **kwargs):
        raise ConnectionError("Stemmarest is down")


@pytest.mark.parametrize("identity", ["guest", "alice"])
def test_unreachable_backend_is_denied_without_crashing(identity):
    result = check(ExplodingClient(), identity, "GET", ("tradition", "t1"))
    assert result.allowed_http_methods == set()
