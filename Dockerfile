# start from the bootstrap image
FROM ghcr.io/tla/stemmaweb-bootstrap:latest

WORKDIR /var/www/stemmaweb
COPY . /var/www/stemmaweb/

# The astute image user may wish to copy in a custom stemmaweb.conf
# before actually running the container.
CMD ["/usr/bin/perl", "/var/www/stemmaweb/script/stemmaweb_server.pl"]
