#!/bin/bash

# The name of the container in which the tests are run
# This is identical with the `stemmaweb-e2e.container_name` property in `docker-compose.test.yml`
TEST_CONTAINER_NAME="stemmaweb-e2e"

# Using a docker stack independent of the dev or prod stack for running the tests
DOCKER_COMPOSE_FILE="docker-compose.test.yml"

# Using the dev environment variables for running the tests
ENV_FILE=".env.test"

# Start the services in detached mode
docker-compose --env-file $ENV_FILE -f $DOCKER_COMPOSE_FILE up -d

# Check the exit status of the docker container responsible for starting the tests
exit_status=$(docker wait $TEST_CONTAINER_NAME)

# Check if the exit status is 0; if so we will remove the containers
if [ "$exit_status" -eq 0 ]; then
  echo "All tests passed ✅"
  stopcmd=down
else
  echo "Some tests failed ❌"
  stopcmd=stop
fi

# Display logs
docker logs $TEST_CONTAINER_NAME

# Stop the services
docker-compose --env-file $ENV_FILE -f $DOCKER_COMPOSE_FILE $stopcmd

# Exit with the exit status of the docker container responsible for starting the tests
exit "$exit_status"
