FROM stemmaweb-middleware
WORKDIR /usr/src
COPY frontend/www www
COPY bin/www-docker.sh .
CMD ./www-docker.sh