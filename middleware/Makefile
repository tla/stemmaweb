# Start the server in development mode with debugging & hot-reload
.PHONY: serve
serve:
	@echo "==> 📡 Serve"
	@poetry run gunicorn --reload --bind=0.0.0.0:3000  'stemmaweb_middleware:create_app()'

serve-background:
	@echo "==> 📡 Serve in Background"
	@(poetry run gunicorn --reload --bind=0.0.0.0:3000  'stemmaweb_middleware:create_app()') &> /dev/null

# Prints the middleware routes
.PHONY: routes
routes:
	@echo "==> 🚦 Routes"
	@poetry run flask --app stemmaweb_middleware:create_app routes

# Start the server in production mode using a secure WSGI server
.PHONY: start
start:
	@echo "==> 🚀 Start"
	@poetry run gunicorn --workers=4 --bind=127.0.0.1:3000 'stemmaweb_middleware:create_app()'

.PHONY: lint
lint:
	@echo "==> 👕 Linting"
	@poetry run black .
	@poetry run isort .
	@poetry run flake8 stemmaweb_middleware --statistics

.PHONY: typecheck
typecheck:
	@echo "==> ✅ Type checks"
	@make mypy pytype pyright

.PHONY: mypy
mypy:
	@poetry run mypy -p stemmaweb_middleware

.PHONY: pytype
pytype:
	@poetry run pytype stemmaweb_middleware

.PHONY: pyright
pyright:
	@poetry run npx pyright


.PHONY: build
build:
	@echo "==> 🏗 Build"
	@poetry build -vvv

.PHONY: check
check:
	@poetry check

.PHONY: clean
clean:
	@rm -rf .coverage
	@rm -rf dist
	@find . -type d -name '.pytype' -exec rm -rf {} +
	@find . -type d -name '.mypy_cache' -exec rm -rf {} +
	@find . -type d -name '__pycache__' -exec rm -rf {} +
	@find . -type d -name '*pytest_cache*' -exec rm -rf {} +
	@find . -type f -name "*.py[co]" -exec rm -rf {} +
