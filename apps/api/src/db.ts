import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";

/**
 * PrismaClient singleton.
 *
 * A single connection pool is shared across the process. In development we
 * cache the instance on `globalThis` so `tsx watch` hot-reloads don't spawn a
 * new client (and exhaust connections) on every file change.
 */
type GlobalWithPrisma = typeof globalThis & {
  __spartarenaPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma: PrismaClient =
  globalForPrisma.__spartarenaPrisma ??
  new PrismaClient({
    log:
      env.LOG_LEVEL === "debug" || env.LOG_LEVEL === "trace"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.__spartarenaPrisma = prisma;
}

/** Verify connectivity at startup; throws if the database is unreachable. */
export async function connectDb(): Promise<void> {
  await prisma.$connect();
  logger.info("Connected to PostgreSQL");
}

/** Gracefully close the connection pool on shutdown. */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Disconnected from PostgreSQL");
}
