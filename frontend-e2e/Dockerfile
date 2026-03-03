FROM cypress/browsers:latest

WORKDIR /app

# install core utilities # for headless mode
RUN apt-get update &&  \
    apt-get install -y curl jq

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .