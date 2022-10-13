# Start the server in development mode with debugging & hot-reload
.PHONY: serve
serve:
	@echo "==> 📡 Serve"
	@poetry run flask --debug --app stemmaweb_middleware:create_app run --port 3000

# Start the server in production mode using a secure WSGI server
.PHONY: start
start:
	@echo "==> 🚀 Start"
	@poetry run gunicorn --workers=4 --bind=127.0.0.1:3000 'stemmaweb_middleware:create_app()'