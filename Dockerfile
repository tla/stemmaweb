# Create the static frontend bundle
FROM ubuntu:jammy AS frontend
WORKDIR /usr/src/frontend
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    lsb-release &&  \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&  \
    apt-get install -y nodejs

# Update npm (got installed in the previous layer with `nodejs`)
RUN npm install -g npm@latest
# Copy in our frontend directory. We will need to mount the env.js file externally.
COPY frontend .


# Now building on top of the local middleware image
# Precondition: `docker build -t stemmaweb-middleware ./middleware`
FROM stemmaweb-middleware AS server
WORKDIR /usr/src/app

# Copy the static bundle into the container to /usr/src/www
COPY --from=frontend /usr/src/frontend/www/ /usr/src/app/stemmaweb_middleware/stemmaweb

# Start gunicorn
EXPOSE ${GUNICORN_PORT}
ENTRYPOINT gunicorn --workers=${GUNICORN_WORKERS} --bind=${GUNICORN_BIND} --log-level=${LOG_LEVEL} --access-logfile=- --error-logfile=- 'stemmaweb_middleware:create_app()'
