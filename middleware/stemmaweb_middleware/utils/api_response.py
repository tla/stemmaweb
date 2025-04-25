import json
from typing import Any

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
    processed_body: dict[str, Any] = (isinstance(body, dict) and body) or {}
    body_is_pydantic_model = body is not None and not isinstance(body, dict)
    if body_is_pydantic_model:
        model: pydantic.BaseModel = body  # type: ignore
        # Calling .json() on a pydantic BaseModel to apply custom encoders
        processed_body = json.loads(model.json())
    if message is not None:
        if "message" in processed_body:
            log.warning(
                "Overwriting existing message "
                f'"{processed_body["message"]}" with "{message}"'
            )
        processed_body["message"] = message
    processed_body["code"] = status
    return Response(
        response=json.dumps(processed_body), status=status, mimetype="application/json"
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
    return Response(
        response=_to_response_data(body),
        status=status,
        mimetype="application/json",
    )


def _to_response_data(
    body: dict | pydantic.BaseModel | None,
) -> str | None:
    """
    Convert a given data object to a dict or pydantic BaseModel.

    :param body: The data to convert.
    :return: The converted data.
    """
    if body is None:
        return None
    if isinstance(body, pydantic.BaseModel):
        return body.json()  # type: ignore
    return json.dumps(body)
