"""Constant values to be reused throughout the application."""

# Used for Google OAuth
GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

# Used for GitHub OAuth
GITHUB_AUTHORIZATION_URL = "https://github.com/login/oauth/authorize"
# Exchange the temp code for an access token
GITHUB_API_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
# Get user info from GitHub, including GH username, excluding private email
GITHUB_API_USER_URL = "https://api.github.com/user"
# Get user email from GitHub, including private email addresses
GITHUB_API_USER_EMAILS_URL = "https://api.github.com/user/emails"

# Used for verifying reCAPTCHA tokens
GOOGLE_RECAPTCHA_VERIFICATION_URL = "https://www.google.com/recaptcha/api/siteverify"
# Determines the lower bound for a valid reCAPTCHA score
GOOGLE_RECAPTCHA_THRESHOLD = 0.5
