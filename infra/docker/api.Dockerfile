# Multi-stage build for the SpartArena API (Fastify + Prisma).
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
COPY packages/byreal-adapter/package.json packages/byreal-adapter/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @spartarena/shared build \
 && pnpm --filter @spartarena/sdk build \
 && pnpm --filter @spartarena/byreal-adapter build \
 && pnpm --filter @spartarena/api prisma:generate \
 && pnpm --filter @spartarena/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000
CMD ["pnpm", "--filter", "@spartarena/api", "start"]
