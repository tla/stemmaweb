# Stemmaweb - a web application for text tradition analysis

Stemmaweb is a web application for viewing and manipulating text traditions based on
the [Stemmarest](http://dhuniwien.github.io/tradition_repo/) data model.

**Table of Contents**

- [Overview](#overview)
- [Trying it out](#trying-it-out--eventually-)
- [Development](#development)
    - [Docker](#docker)
    - [Local](#local)

## Overview

The system is made up of three main components:

- The [Stemmarest](http://dhuniwien.github.io/tradition_repo/) backend, which
  provides a RESTful API for accessing and manipulating text traditions.
- The [Stemmaweb Middleware](./middleware/README.md) which provides an authentication and authorization
  layer on top of the Stemmarest API. The frontend communicates only with this layer directly.
- The [Stemmaweb Frontend](./frontend/README.md) which provides a web interface for
  viewing and manipulating text traditions.

## Trying it out (eventually)

A prerequisite for using Stemmaweb is to have [Make](https://www.gnu.org/software/make/),
[Docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/) installed on your machine. You
also need to configure the environment variables, to do so you can use `.env.prod.example` as a template. After filling
in the missing values (or leaving them as they are), rename the file to `.env.prod`.

Once you have these, you can run the following command to get a working instance of Stemmaweb:

```shell
make start
```

After the build is complete, you can access the system through an `nginx` reverse proxy:

- Frontend: [http://localhost:8888/stemmaweb/](http://localhost:8888/stemmaweb/)
- Middleware: [http://localhost:8888/stemmaweb/requests/]([http://localhost:8888/stemmaweb/requests/)

Please note that the backend will be automatically populated with test data for you to explore.

## Development

### Decrypting Environment Variables

Please create a file called `env_passphrase` in the root directory of the project, containing a single line with the
passphrase to decrypt the environment variables. This file is ignored by git, so you can safely add it to the
repository.

Then you should be able to decrypt the environment variables by running:

```shell
make decrypt-env
```

### Encrypting Environment Variables

If you need to extend any of the environment variables, you can commit your changes to the repository in an encrypted
way by running the command below after editing any of the `.env.*` files:

```shell
make encrypt-env
```

This command will regenerate `env.zip.gpg` with the new environment variables and it is safe to be committed to the
repository. Other contributors will be able to sync the changes by running `make decrypt-env`.

### Docker

Please create a `.env.dev` file in the root directory of the project, based on the `.env.dev.example` file. After doing
so, you can start the development environment with:

```shell
make dev
```

This will start the necessary services in the foreground, so you can see the logs. You can start the frontend and
middleware
by opening a new terminal session and running:

```shell
make shell
```

This will give you a shell in the `stemmaweb` container. From there, you can run the following command to start the
frontend and middleware:

```shell
make run
```

After running this, both the frontend and the middleware will be started in your terminal session in a non-blocking way.
All the logs will be visible in the terminal session automatically as events occur.

You can stop individual services by running `make stop-frontend` or `make stop-middleware` in the `stemmaweb` container.
You can stop all services by running `make stop` in the `stemmaweb` container. The whole docker stack can be stopped by
running `make dev-down` in the root directory of the project.

#### Service Endpoints

- Backend:
    - [http://localhost:3000/](http://localhost:3000/)
    - [http://localhost:8888/stemmaweb/requests/](http://localhost:8888/stemmaweb/requests/)
- Frontend:
    - [http://localhost:5000/](http://localhost:5000/)
    - [http://localhost:8888/stemmaweb/](http://localhost:8888/stemmaweb/)

The preferred way to access the services is through the `nginx` reverse proxy (`http://localhost:8888/*`) so that you
can work with the services as if they were in production.

### Local

**Please note that the preferred way to develop Stemmaweb is through the [Dockerized](https://www.docker.com/) setup.**
However, if you want to develop without Docker, you can do so by following the instructions below.

You will need an instance of Stemmarest running somewhere. The easiest is to run it from Docker:

```shell
docker run -d --name stemmarest -p 8080:8080 dhuniwien/stemmarest:latest
```

Once that is done, you should create a `.env` file in this directory based on `.env.example`.

Now you can add test data to your Stemmarest instance using the script `bin/init-data/init_test_data.sh`; please note
that this script depends on the presence of the [`jq`](https://stedolan.github.io/jq/) program to parse JSON responses
from Stemmarest.

To install the necessary dependencies for the Stemmaweb server, you will need to
have [Poetry](https://python-poetry.org/) and [Make](https://www.gnu.org/software/make/) on your machine. Once you have
Poetry installed, you can run:

```shell
cd middleware && poetry install && cd -
```

from this directory, and

```shell
make --directory=middleware serve
```

to start the server in development mode. You can then access it at [http://127.0.0.1:3000/](http://127.0.0.1:3000/).

The production server can be started using the following command:

```shell
make --directory=middleware start
```

## Testing

An end-to-end test suite is available in the [frontend-e2e](frontend-e2e) directory, using Cypress. To run the tests in
headless mode, you can execute the `make` target below. This will start the necessary services in the background using
Docker, and then execute the defined specifications.

```shell
make tests
```

You can read more about developing tests and executing them with the UI of Cypress,
in [frontend-e2e/README.md](frontend-e2e/README.md).

Note that the whole test suite is also executed in the CI pipeline, as defined
in [.github/workflows/test.yml](.github/workflows/test.yml). Whenever a new Pull Request is opened which modifies any of
the relevant files, the test suite will be executed automatically.