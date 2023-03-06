# Stemmaweb Middleware - Development Guide

The main purpose of the middleware is to forward requests to the Stemmarest backend after taking care of the following:

- Authentication using email-password or Google OAuth
- Authorization based on the user's role (*Guest*, *User*, *Admin*)
- Expose all the external
  services ([Stemmarest](http://dhuniwien.github.io/tradition_repo/), [Stemweb](https://github.com/DHUniWien/Stemweb))
  to the frontend through a uniform API

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
- `stemmaweb_middleware/resources/`: Module encapsulating interaction logic with external services, such as Stemmarest
  and Stemweb.
    - `stemmaweb_middleware/resources/base/*`: Wrapper around the Stemmarest backend.
    - `stemmaweb_middleware/resources/stemmarest/*`: Wrapper around the Stemmarest backend.
    - `stemmaweb_middleware/resources/stemweb/*`: Provides a client class with which requests can be made to the backend
      in a type-safe manner with automatic logging and error handling and passthrough logic to be shared across
      resources.
- `stemmaweb_middleware/utils/*`: Various utility functions used throughout the project.
- `stemmaweb_middleware/app.py`: The main entry point of the middleware. Contains the Flask app and the
  initialization logic, such as logger configuration, extension registration, dependency injection, etc.
- `stemmaweb_middleware/constants.py`: Used to declare various constants used throughout the project.
- `stemmaweb_middleware/extensions.py`: Collects all Flask extensions used in the project.
- `stemmaweb_middleware/models.py`: Contains the shared models used by the middleware.
- `stemmaweb_middleware/settings.py`: Contains the settings for the Flask app. Reads the settings from the
  environment variables.

## Middleware Design

### Authentication

Users can authenticate using either email-password or OAuth providers, such as GitHub and Google. The middleware
uses [Flask-Login](https://flask-login.readthedocs.io/en/latest/) to manage user sessions. As soon as a user logs in
using valid credentials, a session is created and returned to the client as a cookie. The client must send this session
cookie with every request to the middleware.

The actual endpoints and the implementation of the authentication logic can be found
in the [`stemmaweb_middleware/controller/auth`](./stemmaweb_middleware/controller/auth) module.

### Forwarding Requests to External Services

In what follows, we will describe the logic for forwarding requests to external services using Stemmarest as a concrete
example. The same logic applies for the Stemweb component too.

After successful authentication and authorization, the middleware forwards the request to the Stemmarest backend.
Instead of defining every single possible Stemmarest endpoint based
on [its docs](https://dhuniwien.github.io/tradition_repo) we are forwarding each request arriving to the
middleware's `/api` endpoint automatically with all the necessary headers and parameters. This means, that clients of
the middleware should use the same endpoint signatures as the Stemmarest backend.

It is important to note that only those endpoints are forwarded to the specific external service that are explicitly
defined in the `<service>_endpoints.py` module. The concrete modules are:

- [stemmaweb_middleware/resources/stemmarest/stemmarest_endpoints.py](stemmaweb_middleware/resources/stemmarest/stemmarest_endpoints.py)
- [stemmaweb_middleware/resources/stemweb/stemweb_endpoints.py](stemmaweb_middleware/resources/stemweb/stemweb_endpoints.py)

#### All available endpoints

- [Stemmarest](https://dhuniwien.github.io/tradition_repo/)
- [Stemweb](https://github.com/tla/stemmaweb/issues/103#issuecomment-1416056239)

#### Concrete Example

For example, we have the following declarations for Stemmarest:

```python
# Extract from stemmaweb_middleware/resources/stemmarest/stemmarest_endpoints.py
class StemmarestEndpoint(Enum):
    """Enum class to represent Stemmarest API endpoints."""

    TRADITIONS = "/traditions"
    TRADITION = "/tradition/{tradId}"
    USERS = "/users"
    USER = "/user/{userId}"
    READING = "/reading/{readingId}"
```

### Authorization

The middleware accepts or rejects requests based on the user's role. The authorization logic is implemented using
a custom decorator (higher-order-function) `require_min_user_role`, defined in
the [`stemmaweb_middleware/permissions`](./stemmaweb_middleware/permissions) module. The actual declarations are defined
in [`stemmaweb_middleware/resources/stemmarest/permissions/declarations`](stemmaweb_middleware/resources/stemmarest/permissions/declarations)
.

#### A Hands-on Example

To illustrate how custom authorization logic can be implemented, we use a concrete example, in which we define a rule
over the Stemmarest component. The rule states that only logged-in users can delete a tradition, that is, a user with
role *User* or *Admin*.

We know from the [Stemmarest docs](https://dhuniwien.github.io/tradition_repo/) that we need to send a `DELETE` request
to `/tradition/{tradId}/` in order to delete a tradition. 