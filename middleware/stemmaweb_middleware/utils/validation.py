from typing import TypeVar
from urllib.parse import urlparse

import pydantic
from flask.wrappers import Request, Response

from .api_response import abort


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
