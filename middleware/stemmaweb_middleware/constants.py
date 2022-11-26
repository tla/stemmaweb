"""Constant values to be reused throughout the application."""

# Used for Google OAuth
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

# Used for verifying reCAPTCHA tokens
GOOGLE_RECAPTCHA_VERIFICATION_URL = "https://www.google.com/recaptcha/api/siteverify"
# Determines the lower bound for a valid reCAPTCHA score
GOOGLE_RECAPTCHA_THRESHOLD = 0.5
