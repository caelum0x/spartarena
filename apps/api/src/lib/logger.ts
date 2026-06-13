import { pino, type Logger } from "pino";
import { env } from "../env.js";

/**
 * Process-wide structured logger.
 *
 * In development we pretty-print via pino's transport if available; in
 * production we emit newline-delimited JSON for log aggregators. The same
 * instance is shared with Fastify so request logs and app logs interleave
 * with consistent formatting and level.
 */
export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "spartarena-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      'req.headers["x-api-key"]',
      "*.privateKey",
      "*.BACKEND_SIGNER_PRIVATE_KEY",
      "*.VERIFIER_PRIVATE_KEY",
      "*.INTERNAL_API_KEY",
      "*.ANTHROPIC_API_KEY",
      "*.OPENAI_API_KEY",
      "*.ETHERSCAN_API_KEY",
      "*.COINGECKO_API_KEY",
      "*.TELEGRAM_BOT_TOKEN",
      "*.DISCORD_WEBHOOK_URL",
      "BACKEND_SIGNER_PRIVATE_KEY",
      "VERIFIER_PRIVATE_KEY",
    ],
    remove: true,
  },
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino/file",
          options: { destination: 1 },
        },
      }
    : {}),
});

/** Create a child logger scoped to a named module. */
export function childLogger(module: string): Logger {
  return logger.child({ module });
}
