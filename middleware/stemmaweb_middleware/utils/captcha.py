from typing import Literal

import pydantic
import requests


class RecaptchaVerificationDTO(pydantic.BaseModel):
    """
    Data transfer object for a reCAPTCHA verification request.
    Based on the `official docs <https://developers.google.com/recaptcha/docs/verify>`_.
    """

    secret: str
    response: str


RecaptchaErrorCode = Literal[
    "missing-input-secret",
    "invalid-input-secret",
    "missing-input-response",
    "invalid-input-response",
    "bad-request",
    "timeout-or-duplicate",
]


class RecaptchaResponse(pydantic.BaseModel):
    """
    Shape of the response from the reCAPTCHA verification endpoint.
    Based on the `official docs <https://developers.google.com/recaptcha/docs/verify>`_.
    """

    success: bool
    challenge_ts: str | None
    hostname: str | None
    score: float | None
    action: str | None
    error_codes: list[RecaptchaErrorCode] | None = None


class RecaptchaVerifier:
    """
    Verifies reCAPTCHA tokens.
    """

    def __init__(self, secret: str, verification_url: str, threshold: float):
        """
        Initialize a new `RecaptchaVerifier`.

        :param secret: The reCAPTCHA secret to use.
        """
        self.secret = secret
        self.verification_url = verification_url
        self.threshold = threshold

    def verify(self, token: str) -> bool:
        """
        Verify a reCAPTCHA token and return whether it is accepted as a non-bot user.

        Google's server is contacted in the background to verify the token and
        the returned score is compared to the threshold specified for this verifier.
        `True` is returned if the request was successful
        and the retrieved score is above the threshold, `False` otherwise.

        :param token: The reCAPTCHA token to verify.
        :return: Whether the token is accepted as a non-bot user.
        """
        response = self.__process(token)
        return self.__verify(response)

    def __verify(self, response: RecaptchaResponse) -> bool:
        if not response.success:
            return False
        if response.score is None:
            return False
        return response.score >= self.threshold

    def __process(self, token: str) -> RecaptchaResponse:
        dto = RecaptchaVerificationDTO(secret=self.secret, response=token)
        dto_dict = dto.dict()
        response = requests.post(url=self.verification_url, data=dto_dict)
        if not response.ok:
            raise RuntimeError(f"Failed to verify reCAPTCHA token: {response.text}")
        return RecaptchaResponse.parse_raw(response.text)
