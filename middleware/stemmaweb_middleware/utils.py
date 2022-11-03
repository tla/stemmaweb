import json
from typing import TypeVar
from urllib.parse import urlparse

import pydantic
from flask.wrappers import Request, Response
from loguru import logger as log


def url_is_valid(url: str) -> bool:
    """
    Check if a URL is valid.

    :param url: The URL to check.
    :return: True if the URL is valid, False otherwise.
    """
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False


T = TypeVar("T", bound=pydantic.BaseModel)


def try_parse_model(model_type: type[T], req: Request) -> T | Response:
    """
    Try to parse a model of type `T` from a Flask request.
    Returns the parsed model if successful,
    or a Flask Response describing the error otherwise.

    :param model_type: The type of the model to parse.
    :param req: The Flask request to parse the model from.
    :return: The parsed model, or a Flask Response describing the error.
    """
    if not req.is_json:
        return abort(status=400, message="Request body must be JSON")
    try:
        return model_type.parse_raw(req.get_data())
    except pydantic.ValidationError as e:
        return abort(
            status=400,
            message="Invalid request JSON body",
            body=dict(errors=e.errors()),
        )


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
    if isinstance(body, pydantic.BaseModel):
        body = body.dict()
    return Response(
        response=json.dumps(body) if body is not None else None,
        status=status,
        mimetype="application/json",
    )
