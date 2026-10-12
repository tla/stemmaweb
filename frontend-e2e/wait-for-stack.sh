#!/bin/bash
# Block until the middleware and the services behind it report healthy.
# Replaces a fixed `sleep` in the e2e container's entrypoint.

BASE_URL="${CY_STEMMAWEB_MIDDLEWARE_URL:?CY_STEMMAWEB_MIDDLEWARE_URL is not set}"
TIMEOUT="${WAIT_TIMEOUT:-300}"

for endpoint in health stemmarest-health stemweb-health; do
  echo "Waiting for $BASE_URL/$endpoint"
  start=$SECONDS
  until curl --silent --fail --output /dev/null "$BASE_URL/$endpoint"; do
    if (( SECONDS - start > TIMEOUT )); then
      echo "Timed out after ${TIMEOUT}s waiting for $BASE_URL/$endpoint" >&2
      exit 1
    fi
    sleep 2
  done
done
echo "Stack is ready"
