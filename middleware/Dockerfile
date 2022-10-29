# Builder for Poetry, its sole task is to generate `requirements.txt`
FROM python:3.10.8-slim-buster AS builder
WORKDIR /usr/src/app

# Install Poetry
RUN python -m pip install --upgrade pip &&  \
    pip install poetry
COPY pyproject.toml poetry.lock ./
RUN poetry export --without-hashes --format requirements.txt > requirements.txt

# Python 3.10 image to run the application
FROM python:3.10.8-slim-buster AS runner
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/requirements.txt .
RUN pip install -r requirements.txt
COPY stemmaweb_middleware stemmaweb_middleware

ARG GUNICORN_WORKERS=4
ENV GUNICORN_WORKERS=${GUNICORN_WORKERS}
ARG GUNICORN_BIND='127.0.0.1:3000'
ENV GUNICORN_BIND=${GUNICORN_BIND}

ENTRYPOINT gunicorn --workers=$GUNICORN_WORKERS --bind=$GUNICORN_BIND 'stemmaweb_middleware:create_app()'