# Building on top of the local middleware image
# Precondition: `docker build -t stemmaweb-middleware ./middleware`
FROM stemmaweb-middleware
WORKDIR /usr/src

# Copy the static bundle into the container to /usr/src/www
COPY frontend/www www

# Copy the startup script which will handle spawning two processes:
# 1. Plain HTTP server for the static frontend bundle (`python -m http.server`)
# 2. The middleware server (Flask app served by `gunicorn`)
# It also handles generating `env.js`
COPY bin/www-docker.sh .
COPY bin/generate-frontend-env.sh .

# Actually start the above-described script
CMD ./www-docker.sh