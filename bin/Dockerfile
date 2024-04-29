# General-purpose bash environment for utility scripts
FROM ubuntu:jammy

# install core utilities
RUN apt-get update &&  \
    apt-get install -y curl jq gnupg2 zip unzip

WORKDIR /usr/src

# Add wait-for-it to wait for Stemmarest to be ready
COPY wait-for-it.sh .
RUN chmod +x wait-for-it.sh
