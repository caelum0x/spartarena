import { buildServer } from "./server.js";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { connectDb, disconnectDb } from "./db.js";
import { indexerService } from "./modules/indexer/indexer.service.js";

/**
 * Process entrypoint.
 *
 * Boots the server in dependency order: validate env (already done on import),
 * connect to Postgres, build Fastify, start the chain indexer, then listen.
 * Registers signal handlers for graceful shutdown so in-flight requests and the
 * connection pool drain cleanly.
 */
async function main(): Promise<void> {
  await connectDb();

  const app = await buildServer();

  indexerService.start();

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(
    { port: env.PORT, host: env.HOST, env: env.NODE_ENV, chainId: env.CHAIN_ID },
    "SpartArena API listening",
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down");
    indexerService.stop();
    try {
      await app.close();
      await disconnectDb();
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

// Background void promises (indexer `void tick()`, SSE `void poll()`) can reject
// after their originating request has returned. Without a handler, modern Node
// terminates the process on an unhandled rejection — so we log and continue,
// keeping the API up. A truly uncaught synchronous exception leaves the process
// in an unknown state, so we log fatal and exit for the supervisor to restart.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection (suppressed)");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
