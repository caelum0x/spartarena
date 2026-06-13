#!/usr/bin/env bash
# Boot Postgres + Redis and apply Prisma migrations for the SpartArena API.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "==> Starting Postgres + Redis"
docker compose up -d postgres redis

echo "==> Waiting for Postgres health"
until docker compose exec -T postgres pg_isready -U postgres -d spartarena >/dev/null 2>&1; do
  sleep 1
done

echo "==> Generating Prisma client + syncing schema"
pnpm --filter @spartarena/api prisma:generate
pnpm --filter @spartarena/api exec prisma db push

echo "==> Seeding demo data"
pnpm --filter @spartarena/api db:seed || echo "(seed skipped)"

echo "==> Done."
