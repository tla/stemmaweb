# Start the server in development mode with debugging & hot-reload
.PHONY: serve
serve:
	@echo "==> 📡 Serve"
	@poetry run flask --debug --app stemmaweb_middleware:create_app run --host 127.0.0.1 --port 3000

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
