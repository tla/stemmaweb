# Stemmaweb Middleware

This module holds the source code of the middleware that is used to connect the frontend to the backend, taking care
of authentication and authorization. The middleware is a Python Flask application, exposing REST endpoints to the
frontend.

## Running Locally

You can decide whether you would like to run the application locally using [Docker](https://www.docker.com/) or by
installing the dependencies and starting the server using [Poetry](https://python-poetry.org/).

Regardless of the method you choose, you will need to specify the following environment variables to start the server
successfully. As the table below shows, some of these have default values (hence they are optional) and some are
required.

| Variable               | Description                                                                                                                                                                                                      | Default                            |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------|
| `STEMMAREST_ENDPOINT`  | The URL where the Stemmarest backend is running                                                                                                                                                                  | `http://127.0.0.1:8080/stemmarest` |
| `STEMMAWEB_HOST`       | The URL where this middleware is running                                                                                                                                                                         | `http://127.0.0.1:3000`            |
| `SECRET_KEY`           | Secret key for the Flask application, used by [Flask-Login](https://github.com/maxcountryman/flask-login).<br />Generate it by executing `python -c 'import secrets; print(secrets.token_hex())'` in your shell. | 🚫                                 |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                                                                                                                                                                           | 🚫                                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                                                                                                                                                       | 🚫                                 |
| `SERVER_NAME`          | The name of the server where this middleware is running.<br />Used as the Google OAuth authorized URL.                                                                                                           | `127.0.0.1:3000`                   |
| `LOG_LEVEL`            | Logging verbosity                                                                                                                                                                                                | `DEBUG`                            |
| `LOGFILE`              | Destination file to store the logs, relative to this module's root                                                                                                                                               | `stemmaweb_middleware.log`         |
| `LOG_BACKTRACE`        | Whether error backtraces should be logged                                                                                                                                                                        | `True`                             |

### Running with Poetry

If you don't have Poetry installed on your machine you can do so by
following [the official docs](https://python-poetry.org/docs/#installing-with-the-official-installer). You will also
need [Make](https://www.gnu.org/software/make/) to run commands easily.

Please create a `.env` file and fill it with the environment variables described above. You can use the `.env.example`
file as a template.

Install the dependencies using Poetry, then start the server:

```shell
poetry install
make serve
```

The server be available at [http://127.0.0.1:3000/](http://127.0.0.1:3000/). Please note that the hostname, port number
and the environment variables `STEMMAWEB_HOST`, `SERVER_NAME` must be in sync.

### Running with Docker

Build the image using the following command:

```shell
docker build -t stemmaweb-middleware .
```

Run the image using the command below, after replacing the environment variables with your own values:

```shell
docker run -it \
    -p 3000:3000 \
	-e STEMMAREST_ENDPOINT= \
	-e STEMMAWEB_HOST= \
	-e SECRET_KEY= \
	-e GOOGLE_CLIENT_ID= \
	-e GOOGLE_CLIENT_SECRET= \
	-e SERVER_NAME= \
	-e LOG_LEVEL=DEBUG \
	-e LOGFILE=stemmaweb_middleware.log \
	-e LOG_BACKTRACE=True \
	stemmaweb-middleware
```