import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { childLogger } from "../../lib/logger.js";
import { decisionsRepository } from "../decisions/decisions.repository.js";
import { toDecisionDto } from "../decisions/decisions.service.js";

/**
 * Live War Chronicle stream (Server-Sent Events).
 *
 *   GET /chronicle/stream
 *
 * On a fixed interval the handler polls the decisions repository for records
 * indexed after a `[createdAt, id]` cursor and pushes each as an SSE `data:`
 * event (a serialized {@link DecisionDto}). A heartbeat comment is sent every
 * ~15s so proxies and clients keep the connection alive. All timers/queries are
 * torn down when the client disconnects, and transient DB errors are logged and
 * skipped (the loop retries on the next tick) so one failure never kills the
 * stream.
 */

const POLL_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
/** Max rows pulled per poll, bounding memory/latency per tick. */
const BATCH_SIZE = 50;
/** Hard cap on concurrent SSE connections — bounds DB pool + socket usage. */
const MAX_CONNECTIONS = Number(process.env.CHRONICLE_MAX_CONNECTIONS ?? 200);

const log = childLogger("chronicle.stream");

/** Live SSE connection count, capped at MAX_CONNECTIONS. */
let activeConnections = 0;

interface Cursor {
  readonly createdAt: Date;
  readonly id: string;
}

/** SSE-encode a named-less data event with a JSON payload. */
function sseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function chronicleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/chronicle/stream", (req: FastifyRequest, reply: FastifyReply) => {
    // Refuse new streams past the cap so a flood can't exhaust the DB pool/sockets.
    if (activeConnections >= MAX_CONNECTIONS) {
      reply.code(503).header("retry-after", "30").send({
        success: false,
        error: { code: "CAPACITY", message: "Chronicle stream is at capacity; retry shortly." },
      });
      return;
    }
    activeConnections += 1;

    // Detach from Fastify's lifecycle: we own the raw socket from here and
    // Fastify must not try to send/serialize a reply for this request.
    reply.hijack();

    // Take over the raw socket: SSE needs an unbuffered, long-lived response.
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    reply.raw.write(": connected\n\n");

    let cursor: Cursor | null = null;
    let closed = false;
    let polling = false;

    const poll = async (): Promise<void> => {
      if (closed || polling) return;
      polling = true;
      try {
        const rows = await decisionsRepository.listSince(cursor, BATCH_SIZE);
        for (const row of rows) {
          if (closed) break;
          reply.raw.write(sseData(toDecisionDto(row)));
          cursor = { createdAt: row.createdAt, id: row.id };
        }
      } catch (err) {
        // Resilient to DB hiccups: log and retry on the next tick.
        log.warn({ err }, "Chronicle poll failed; will retry");
      } finally {
        polling = false;
      }
    };

    const pollTimer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    const heartbeatTimer = setInterval(() => {
      if (!closed) reply.raw.write(": heartbeat\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      activeConnections -= 1;
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    };

    req.raw.on("close", cleanup);
    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);

    // Prime the stream immediately so clients see backlog without waiting a tick.
    void poll();
  });
}
