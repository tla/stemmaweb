import datetime
from typing import Any

import pydantic


class StemwebJobResult(pydantic.BaseModel):
    """
    Model to represent the result of a Stemweb job.
    We model this explicitly, since we expect the Stemweb API to POST
    results in this format.
    """

    jobid: str
    # From "%Y-%m-%d %H:%M:%S.%f" format
    start_time: datetime.datetime
    # From "%Y-%m-%d %H:%M:%S.%f" format
    end_time: datetime.datetime
    status: int
    algorithm: str
    userid: str
    textid: str
    parameters: dict[str, Any]
    return_host: str
    return_path: str
    format: str
    result: str

    class Config:
        # Handles loading raw datetime strings into datetime objects
        json_encoders = {
            datetime.datetime: lambda dt: dt.strftime("%Y-%m-%d %H:%M:%S.%f"),
        }
        # Handles dumping datetime objects into raw datetime strings


class StemwebJobResultPollResponse(pydantic.BaseModel):
    results: list[StemwebJobResult]
