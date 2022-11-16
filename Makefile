.PHONY: build
build:
	@echo "==> 🏗 Build Containers"
	@docker build -t stemmaweb-middleware ./middleware
	@docker-compose build

start:
	@echo "==> 🚀 Start"
	@docker-compose up