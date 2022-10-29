# Stemmaweb Middleware

## Running with Docker

Build the image using the following command:

```shell
docker build -t stemmaweb-middleware .
```

Run the image using the command below, after replacing the environment variables with your own values:

```shell
docker run -it \
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