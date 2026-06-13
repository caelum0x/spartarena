# Build for the SpartArena agent runner (tsx).
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/byreal-adapter/package.json packages/byreal-adapter/
COPY apps/agent-runner/package.json apps/agent-runner/
RUN pnpm install --frozen-lockfile=false

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["pnpm", "--filter", "@spartarena/agent-runner", "demo:onchain"]
