.PHONY: build
build:
	@echo "==> 🏗 Build Containers"
	@docker build -t stemmaweb-middleware ./middleware
	@docker-compose build

start:
	@echo "==> 🚀 Start"
	@docker-compose up

install-middleware:
	@echo "==> 📦 Install Middleware"
	@cd middleware && poetry install && cd -

install-frontend:
	@echo "==> 📦 Install Frontend"
	@./bin/generate-frontend-env.sh > frontend/www/src/js/env.js
	@cd frontend && npm install && cd -

run-middleware:
	@echo "==> 📡 Run Middleware"
	@cd middleware && make serve

run-frontend:
	@echo "==> 📡 Run Frontend"
	@cd frontend && npm run serve:headless && cd -

build-dev:
	@echo "==> 🏗 Build Dev Containers"
	@docker-compose -f docker-compose.dev.yml build

dev: build-dev
	@echo "==> 💻 Development"
	@docker-compose -f docker-compose.dev.yml up

stop-dev:
	@echo "==> 🛑 Stop Dev Containers"
	@docker-compose -f docker-compose.dev.yml down