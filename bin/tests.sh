#!/bin/bash

# The name of the container in which the tests are run
# This is identical with the `stemmaweb-e2e.container_name` property in `docker-compose.test.yml`
TEST_CONTAINER_NAME="stemmaweb-e2e"

# Start the services in detached mode
docker-compose --env-file .env.dev -f docker-compose.test.yml up -d

# Check the exit status of the docker container responsible for starting the tests
exit_status=$(docker wait $TEST_CONTAINER_NAME)

# Check if the exit status is 0
if [ "$exit_status" -eq 0 ]; then
  echo "All tests passed ✅"
else
  echo "Some tests failed ❌"
fi

# Display logs
docker logs $TEST_CONTAINER_NAME

# Stop the services
docker-compose --env-file .env.dev -f docker-compose.test.yml down

# Exit with the exit status of the docker container responsible for starting the tests
exit "$exit_status"
