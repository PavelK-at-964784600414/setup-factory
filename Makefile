.PHONY: help install dev build docker-up docker-down docker-logs db-setup clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install
	cd api && npm install
	cd frontend && npm install
	cd worker && npm install
	cd agent && pip install -r requirements.txt

dev: ## Run all services in development mode
	npm run dev

dev-docker: docker-up ## Start infrastructure with Docker and run services locally
	@echo "Starting PostgreSQL and Redis..."
	docker-compose up -d postgres redis
	@echo "Waiting for services to be ready..."
	sleep 5
	@echo "Starting development servers..."
	npm run dev

build: ## Build all services
	npm run build

docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-restart: docker-down docker-up ## Restart Docker services

db-setup: ## Initialize database
	cd api && npx prisma migrate dev --name init && npx prisma generate

db-migrate: ## Run database migrations
	cd api && npx prisma migrate dev

db-reset: ## Reset database (WARNING: deletes all data)
	cd api && npx prisma migrate reset

db-studio: ## Open Prisma Studio
	cd api && npx prisma studio

sync-scripts: ## Trigger script sync from Bitbucket
	curl -X POST http://localhost:3001/api/admin/sync-scripts

test-api: ## Test API health
	curl http://localhost:3001/health

runner-build: ## Build runner Docker image
	cd infra/runner-images && \
	docker build -f Dockerfile.runner -t setup-factory/runner:latest .

runner-test: ## Test runner image
	docker run --rm \
		-e JOB_ID=test-123 \
		-e SCRIPT_ID=test-script \
		-e PARAMETERS='{"host":"test.example.com","user":"test"}' \
		setup-factory/runner:latest

clean: ## Clean build artifacts and dependencies
	rm -rf api/node_modules api/dist
	rm -rf frontend/node_modules frontend/.next frontend/out
	rm -rf worker/node_modules worker/dist
	rm -rf agent/__pycache__ agent/*.pyc

clean-all: clean docker-down ## Clean everything including Docker volumes
	docker-compose down -v

setup: install db-setup ## Initial setup (install + database)
	@echo "✓ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make docker-up' to start services"
	@echo "  3. Visit http://localhost:3000"

.DEFAULT_GOAL := help
