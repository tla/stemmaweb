# Stemmaweb Middleware - Development Guide

The main purpose of the middleware is to forward requests to the Stemmarest backend after taking care of the following:

- Authentication using email-password or Google OAuth
- Authorization based on the user's role (*Guest*, *User*, *Admin*)

The frontend communicates with the middleware using REST endpoints. The middleware is built
using [Flask](http://flask.pocoo.org/), a Python microframework.

## Local Development

For the initial steps to set up a local development environment, please refer to [README.md](./README.md).

This project strives to comply with standard Python development best practices, therefore we are making use of the
following tools:

- [Poetry](https://python-poetry.org/) for dependency management and packaging
- [Black](https://github.com/psf/black) for code formatting
- [Flake8](https://flake8.pycqa.org/en/latest/) for linting
- [Mypy](http://mypy-lang.org/), [pyright](https://github.com/microsoft/pyright)
  and [pytype](https://google.github.io/pytype/) for static type checking
- [Pytest](https://docs.pytest.org/en/latest/) for testing

Formatting and linting can be run using the following command:

```shell
make lint
```

Type checking can be run using the following command:

```shell
make typecheck
```

## Project Structure

The project's structure was inspired by the very
popular [cookiecutter-flask](https://github.com/cookiecutter-flask/cookiecutter-flask/tree/master/%7B%7Bcookiecutter.app_name%7D%7D/%7B%7Bcookiecutter.app_name%7D%7D)
structure.

The middleware is highly modular. Its most notable parts are described below.

- `stemmaweb_middleware/controller/*`: Contains the logic for the REST endpoints.
- `stemmaweb_middleware/permissions/*`: Contains the logic based on which user permissions are granted. Provides a
  declarative mini-framework for associating user roles with server resources.
- `stemmaweb_middleware/stemmarest/*`: Wrapper around the Stemmarest backend. Provides a client class with which
  requests can be made to the backend in a type-safe manner with automatic logging and error handling.
- `stemmaweb_middleware/app.py`: The main entry point of the middleware. Contains the Flask app and the
  initialization logic.
- `stemmaweb_middleware/constants.py`: Used to declare various constants used throughout the project.
- `stemmaweb_middleware/extensions.py`: Collects all Flask extensions used in the project.
- `stemmaweb_middleware/models.py`: Contains the shared models used by the middleware.
- `stemmaweb_middleware/settings.py`: Contains the settings for the Flask app. Reads the settings from the
  environment variables.
- `stemmaweb_middleware/utils.py`: Contains various utility functions used throughout the project.

## Middleware Design

### Authentication

Users can authenticate using either email-password or Google OAuth. The middleware
uses [Flask-Login](https://flask-login.readthedocs.io/en/latest/) to manage user sessions. As soon as a user logs in
using valid credentials, a session is created and returned to the client as a cookie. The client must send this session
cookie with every request to the middleware.

The actual endpoints and the implementation of the authentication logic can be found
in the [`stemmaweb_middleware/controller/auth`](./stemmaweb_middleware/controller/auth) module.

### Authorization

The middleware accepts or rejects requests based on the user's role. The authorization logic is implemented using
a custom decorator (higher-order-function) `require_min_user_role`, defined in
the [`stemmaweb_middleware/permissions`](./stemmaweb_middleware/permissions) module. The actual declarations are defined
in [`stemmaweb_middleware/stemmarest/permissions/declarations`](./stemmaweb_middleware/stemmarest/permissions/declarations)
.

### Forwarding Requests to the Stemmarest Backend

After successful authentication and authorization, the middleware forwards the request to the Stemmarest backend.
Instead of defining every single possible Stemmarest endpoint based
on [its docs](https://dhuniwien.github.io/tradition_repo) we are forwarding each request arriving to the
middleware's `/api` endpoint automatically with all the necessary headers and parameters. This means, that clients of
the middleware should use the same endpoint signatures as the Stemmarest backend.

#### Catching Wildcard Endpoints

Due to the fact that Flask does not support wildcard endpoints, we are defining routes dynamically up to 10 levels deep.
In practice this looks like as depicted below:

- `/api/<lvl0>` to catch requests without nesting, e.g `/users`, `/traditions`, etc.
- `/api/<lvl0>/<lvl1>` to catch requests where we have a single level of nesting, eg `/reading/<readingId>`, ...
- `/api/<lvl0>/<lvl1>/...` and so on...

This logic is implemented
in [`stemmaweb_middleware/controller/api/routes.py`](./stemmaweb_middleware/controller/api/routes.py).