import Fastify, {
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { AppError, fail } from "./lib/errors.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { agentsRoutes } from "./modules/agents/agents.routes.js";
import { tasksRoutes } from "./modules/tasks/tasks.routes.js";
import { decisionsRoutes } from "./modules/decisions/decisions.routes.js";
import { reputationRoutes } from "./modules/reputation/reputation.routes.js";
import { executionRoutes } from "./modules/execution/execution.routes.js";
import { demoRoutes } from "./modules/demo/demo.routes.js";
import { stakingRoutes } from "./modules/staking/staking.routes.js";
import { byrealRoutes } from "./modules/byreal/byreal.routes.js";
import { chronicleRoutes } from "./modules/chronicle/chronicle.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";

/**
 * Build a fully-configured Fastify instance.
 *
 * Registers CORS + sensible, a JSON BigInt serialiser, a global error handler
 * that maps {@link AppError}/{@link ZodError}/unknown errors onto the shared
 * `{ success, data, error }` envelope, and all module routes. `main.ts` wires
 * lifecycle (db connect, indexer, signals) around the instance this returns.
 */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    // pino's Logger satisfies FastifyBaseLogger at runtime; cast so the built
    // instance is typed with Fastify's default logger (keeps the return type
    // assignable to FastifyInstance).
    loggerInstance: logger as unknown as FastifyBaseLogger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  // BigInt is not JSON-serialisable by default; install a global reply
  // serialiser that renders BigInt values as decimal strings.
  app.setReplySerializer((payload) => JSON.stringify(payload, bigintReplacer));

  await app.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(sensible);

  // Global rate limit (per-IP). Protects LLM/chain/explorer budgets and the
  // signer from floods; the SSE stream and health are exempt so long-lived and
  // probe traffic isn't throttled. Per-route stricter limits are layered below.
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    allowList: (req) => req.url === "/health" || req.url === "/health/ready" || req.url === "/chronicle/stream",
    errorResponseBuilder: (_req, ctx) =>
      fail({ code: "RATE_LIMITED", message: `Rate limit exceeded. Retry in ${Math.ceil(ctx.ttl / 1000)}s.` }),
  });

  // ── Global error handler ────────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(fail(error.toApiError()));
    }
    if (error instanceof ZodError) {
      return reply
        .code(400)
        .send(fail({ code: "VALIDATION_ERROR", message: "Validation failed", details: error.flatten() }));
    }
    // Fastify validation / known HTTP errors carry a statusCode.
    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, "Unhandled server error");
      return reply.code(500).send(fail({ code: "INTERNAL_ERROR", message: "Internal server error" }));
    }
    return reply
      .code(statusCode)
      .send(fail({ code: error.code ?? "REQUEST_ERROR", message: error.message }));
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .code(404)
      .send(fail({ code: "NOT_FOUND", message: `Route ${request.method} ${request.url} not found` }));
  });

  // ── Auth gate for state-mutating requests ────────────────────────────────
  // When INTERNAL_API_KEY is configured, every POST/PUT/PATCH/DELETE must carry a
  // matching `x-api-key` header. This protects the privileged endpoints (execute,
  // verify, score, release) that drive the backend signer. Unset = open (local dev).
  // In production, env validation (env.ts superRefine) guarantees the key is
  // present, so this gate is always active there. In dev it is opt-in: unset =
  // open for local convenience.
  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (env.INTERNAL_API_KEY !== undefined) {
    const expected = env.INTERNAL_API_KEY;
    app.addHook("onRequest", async (request, reply) => {
      if (!MUTATING.has(request.method)) return;
      if (request.headers["x-api-key"] !== expected) {
        return reply
          .code(401)
          .send(fail({ code: "UNAUTHORIZED", message: "A valid x-api-key header is required." }));
      }
    });
  }

  // ── Routes ──────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(agentsRoutes);
  await app.register(tasksRoutes);
  await app.register(projectsRoutes);
  await app.register(decisionsRoutes);
  await app.register(reputationRoutes);
  await app.register(executionRoutes);
  await app.register(demoRoutes);
  await app.register(stakingRoutes);
  await app.register(byrealRoutes);
  await app.register(chronicleRoutes);
  await app.register(notificationsRoutes);

  return app;
}

/** JSON replacer that renders BigInt as a decimal string. */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
