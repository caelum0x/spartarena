import type { FastifyInstance } from "fastify";
import { prisma } from "../../db.js";
import { env } from "../../env.js";
import { ok } from "../../lib/errors.js";
import { canRead, canWrite } from "../../chain/client.js";

/**
 * Liveness and readiness endpoints.
 *
 * `GET /health` is a cheap liveness probe. `GET /health/ready` additionally
 * checks the database connection and reports chain capability flags so operators
 * can see at a glance whether reads/writes are configured.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () =>
    ok({
      status: "ok",
      service: "spartarena-api",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    }),
  );

  app.get("/health/ready", async (_req, reply) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const body = ok({
      status: dbOk ? "ready" : "degraded",
      database: dbOk ? "up" : "down",
      chain: {
        chainId: env.CHAIN_ID,
        reads: canRead(),
        writes: canWrite(),
      },
    });

    return reply.code(dbOk ? 200 : 503).send(body);
  });
}
