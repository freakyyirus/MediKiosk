.PHONY: help dev dev-backend dev-frontend docker-up docker-down db-migrate db-seed test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- Development ----
dev: ## Start full development stack (Docker services + backend + frontend)
	docker compose up -d postgres redis minio
	@echo "Waiting for services to start..."
	@sleep 3
	@make dev-backend &
	@make dev-frontend

dev-backend: ## Start backend dev server
	cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend dev server
	cd frontend && npm run dev

# ---- Docker ----
docker-up: ## Start all services via Docker Compose
	docker compose up --build -d

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## Tail Docker logs
	docker compose logs -f

# ---- Database ----
db-migrate: ## Run database migrations
	cd backend && alembic upgrade head

db-revision: ## Create new migration revision
	cd backend && alembic revision --autogenerate -m "$(msg)"

db-seed: ## Seed database with sample data
	cd backend && python -m app.scripts.seed_data

db-reset: ## Reset database (drop all + re-migrate + seed)
	cd backend && alembic downgrade base && alembic upgrade head && python -m app.scripts.seed_data

# ---- Testing ----
test: ## Run all tests
	cd backend && pytest --cov=app --cov-report=term-missing -v
	cd frontend && npm test

test-backend: ## Run backend tests only
	cd backend && pytest --cov=app --cov-report=term-missing -v

test-frontend: ## Run frontend tests only
	cd frontend && npm test

# ---- Linting ----
lint: ## Run linters
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint

lint-fix: ## Fix linting issues
	cd backend && ruff check --fix . && ruff format .
	cd frontend && npm run lint:fix

# ---- Cleanup ----
clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name dist -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist backend/.coverage backend/htmlcov
