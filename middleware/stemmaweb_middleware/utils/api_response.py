import json

import pydantic
from flask.wrappers import Response
from loguru import logger as log


def abort(
    *,
    status: int,
    body: dict | pydantic.BaseModel | None = None,
    message: str | None = None,
) -> Response:
    """
    Abort a Flask request with a given status code and body.

    :param status: The status code to abort with.
    :param body: The body to return with the response.
    :param message: A message to return with the response.
    :return: A Flask Response.
    """
    log.error(f'Aborting with status "{status}", body "{body}" and message "{message}"')
    if body is None:
        body = dict()
    if not isinstance(body, dict):
        body = body.dict()
    if message is not None:
        body["message"] = message
    body["code"] = status
    body.pop("image", None)
    return Response(
        response=json.dumps(body), status=status, mimetype="application/json"
    )


def success(
    *, status: int = 200, body: dict | pydantic.BaseModel | None = None
) -> Response:
    """
    Return a Flask Response with a given status code and body.

    :param status: The status code to return.
    :param body: The body to return with the response.
    :return: A Flask Response.
    """
    if body is not None and isinstance(body, pydantic.BaseModel):
        base_model: pydantic.BaseModel = body
        body = base_model.dict()
    return Response(
        response=json.dumps(body) if body is not None else None,
        status=status,
        mimetype="application/json",
    )
