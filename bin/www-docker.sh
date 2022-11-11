#!/bin/bash

# Start serving the static HTML files on port 5000
echo -e "\e[1;32mStarting to serve static HTML files on port 5000\e[0m"
python -m http.server --directory=www 5000 &

# Start the middleware
cd app || exit
echo -e "\e[1;32mStarting the middleware\e[0m"
gunicorn --workers="$GUNICORN_WORKERS" --bind="$GUNICORN_BIND" 'stemmaweb_middleware:create_app()'

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?