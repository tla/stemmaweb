#!/bin/bash

# Array of environment variables to be processed
# - STEMMAWEB_MIDDLEWARE_URL is the URL of the Stemmaweb middleware
# - RECAPTCHA_SITE_KEY is the public key for the reCAPTCHA service
ENV_VARS_TO_COPY=(
    "STEMMAWEB_MIDDLEWARE_URL"
    "RECAPTCHA_SITE_KEY"
)

statements=""

# Loop over the environment variables to be copied
for ENV_VAR in "${ENV_VARS_TO_COPY[@]}"; do
    # Check if the environment variable is set
    if [[ -z "${!ENV_VAR}" ]]; then
        # If the environment variable is not set, print an error message and exit
        echo -e "\e[1;31mERROR: Environment variable $ENV_VAR is not set\e[0m"
        exit 1
    fi

    # If the environment variable is set, append it to `statements`
    # as a JS declaration: `const ENV_VAR = "value of ENV_VAR";`
    statements="${statements}const $ENV_VAR = \"${!ENV_VAR}\";\n"
done

# shellcheck disable=SC2059
printf "$statements"