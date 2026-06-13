# SpartArena — handy developer targets.
# Thin wrappers over the pnpm workspace + Foundry. Run `make help` for the menu.

.DEFAULT_GOAL := help
.PHONY: help install build typecheck test contracts-build deploy-local deploy-sepolia \
        verify-sepolia anvil web api agent-demo agent-demo-onchain db-up db-down \
        db-migrate db-seed clean

# ── Setup ────────────────────────────────────────────────────────────────────

install: ## Install all workspace dependencies (pnpm)
	pnpm install

build: ## Build every package and app
	pnpm -r build

typecheck: ## Typecheck every package and app
	pnpm -r typecheck

clean: ## Remove build artifacts across the workspace
	pnpm -r clean

# ── Contracts (Foundry) ──────────────────────────────────────────────────────

contracts-build: ## Compile the Solidity contracts
	pnpm contracts:build

test: ## Run the Foundry contract test suite
	pnpm contracts:test

anvil: ## Start a local anvil chain (chainId 31337) in the foreground
	anvil

deploy-local: ## Deploy the full contract set to local anvil (writes deployments/31337.json)
	pnpm contracts:deploy:local

deploy-sepolia: ## Deploy + verify the contract set on Mantle Sepolia (chainId 5003)
	pnpm contracts:deploy:mantle-sepolia

verify-sepolia: ## Verify already-deployed contracts on the Mantle Sepolia explorer
	pnpm --filter @spartarena/contracts verify:mantle-sepolia

# ── Apps ─────────────────────────────────────────────────────────────────────

web: ## Run the Next.js web app (http://localhost:3000)
	pnpm web:dev

api: ## Run the Fastify backend API (http://localhost:4000)
	pnpm --filter @spartarena/api dev

agent-demo: ## Run the offline agent demo (no chain writes)
	pnpm agent:demo

agent-demo-onchain: ## Run the agent demo and settle proofs on-chain
	pnpm --filter @spartarena/agent-runner demo:onchain

# ── Database (Postgres via docker-compose) ───────────────────────────────────

db-up: ## Start Postgres (and Redis) via docker compose
	docker compose up -d

db-down: ## Stop the docker compose services
	docker compose down

db-migrate: ## Apply Prisma migrations for the API
	pnpm --filter @spartarena/api prisma:migrate

db-seed: ## Seed the database with demo data
	pnpm --filter @spartarena/api db:seed

# ── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
