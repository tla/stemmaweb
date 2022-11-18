.PHONY: build
build:
	@echo "==> 🏗 Build Containers"
	@docker build -t stemmaweb-middleware ./middleware
	@docker-compose build

start: build
	@echo "==> 🚀 Start"
	@docker-compose up

# Spawns a new shell in the dev docker container
shell:
	@echo "==> 🐚 Shell"
	@docker exec -it stemmaweb bash

################################################################
# Commands below are for the dockerized development environment
# They are only expected to work inside the docker container
################################################################

build-dev:
	@echo "==> 🏗 Build Dev Containers"
	@docker-compose -f docker-compose.dev.yml build

dev: build-dev
	@echo "==> 💻 Development"
	@docker-compose -f docker-compose.dev.yml up

install-middleware:
	@echo "==> 📦 Install Middleware"
	@cd middleware && poetry install && cd -

install-frontend:
	@echo "==> 📦 Install Frontend"
	@./bin/generate-frontend-env.sh > frontend/www/src/js/env.js
	@cd frontend && npm install && cd -

install: install-middleware install-frontend

run-middleware:
	@echo "==> 📡 Run Middleware"
	@cd middleware && make serve-background && cd -

run-frontend:
	@echo "==> 📡 Run Frontend"
	@cd frontend && npm run serve:background && cd -

run: run-middleware run-frontend

stop-middleware:
	@echo "==> 🛑 Stop Middleware"
	@killport 3000 || true

stop-frontend:
	@echo "==> 🛑 Stop Frontend"
	@killport 5000 || true

stop: stop-middleware stop-frontend

dev-down:
	@echo "==> 🛑 Stop Dev Containers"
	@docker-compose -f docker-compose.dev.yml down
