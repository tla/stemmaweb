#!/bin/bash
#
# Run the controller test suite against the development Docker stack.
#
# The tests are integration tests: they drive the Catalyst application in
# process, and the application talks to the Stemmarest instance that
# docker-compose.dev.yml provides.  They therefore have to run inside the
# stack, not on the host.
#
# Usage:
#   script/run_tests.sh                     # the controller tests
#   script/run_tests.sh t/controller_Root.t # specific files
#
# The last test file to run is t/controller_Routes.t, which uses the action log
# produced by the others to check that every route really was exercised.

set -o pipefail

cd "$(dirname "$0")/.." || exit 1

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
SERVICE=${SERVICE:-stemmaweb}
ACTION_LOG=${ACTION_LOG:-/tmp/stemmaweb-actions.log}
STEMMAWEB_HOME=${STEMMAWEB_HOME:-/var/www/stemmaweb}

compose() {
    docker compose -f "$COMPOSE_FILE" "$@"
}

# The default set of files: everything that covers lib/stemmaweb/controller.
default_tests=(
    t/controller_Util.t
    t/controller_Users.t
    t/controller_Stemma.t
    t/controller_Root.t
    t/controller_Relation.t
    t/controller_Stemweb.t
)

if [ "$#" -gt 0 ]; then
    tests=("$@")
else
    tests=("${default_tests[@]}")
fi

# --- is the stack up? ------------------------------------------------------

if ! docker ps --format '{{.Names}}' | grep -qx "$(basename "$SERVICE")"; then
    echo "The development stack is not running; starting it."
    compose up -d || exit 1
    printf 'Waiting for the application'
    for _ in $(seq 1 60); do
        if curl -sf -o /dev/null http://localhost:3000/; then
            break
        fi
        printf '.'
        sleep 2
    done
    echo
fi

if ! curl -sf -o /dev/null http://localhost:3000/; then
    echo "The application is not answering on http://localhost:3000/." >&2
    echo "Check 'docker compose -f $COMPOSE_FILE logs $SERVICE'." >&2
    exit 1
fi

# --- run the tests ---------------------------------------------------------

# Start from an empty action log so that the coverage check sees only this run.
compose exec -T "$SERVICE" rm -f "$ACTION_LOG"

status=0

echo "Running the controller tests"
if ! compose exec -T \
        -e STEMMAWEB_ACTION_LOG="$ACTION_LOG" \
        -w "$STEMMAWEB_HOME" \
        "$SERVICE" prove -l "${tests[@]}"; then
    status=1
fi

# The route inventory and the coverage assertion need the log the run above
# produced, so this always goes last and always runs.
echo
echo "Checking route inventory and dispatch coverage"
if ! compose exec -T \
        -e STEMMAWEB_ACTION_LOG="$ACTION_LOG" \
        -w "$STEMMAWEB_HOME" \
        "$SERVICE" prove -l t/controller_Routes.t; then
    status=1
fi

exit $status
