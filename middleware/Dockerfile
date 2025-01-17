# Builder for Poetry, its sole task is to generate `requirements.txt`
FROM python:3.10.8-slim-buster AS builder
WORKDIR /usr/src/app

# Install Poetry
RUN python -m pip install --upgrade pip &&  \
    pip install poetry==1.8.5
COPY pyproject.toml poetry.lock ./
RUN poetry export --without-hashes --format requirements.txt > requirements.txt

# Python 3.10 image to run the application
FROM python:3.10.8-slim-buster AS runner
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/requirements.txt .
RUN pip install -r requirements.txt
COPY stemmaweb_middleware stemmaweb_middleware

ENV GUNICORN_WORKERS=2
ENV GUNICORN_BIND='0.0.0.0:3000'

CMD gunicorn --workers=$GUNICORN_WORKERS --bind=$GUNICORN_BIND --log-level=debug --access-logfile=- --error-logfile=- 'stemmaweb_middleware:create_app()'