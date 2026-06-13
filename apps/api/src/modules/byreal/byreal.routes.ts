import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import {
  byrealPoolsQuerySchema,
  byrealTokensQuerySchema,
} from "./byreal.schema.js";
import { byrealService } from "./byreal.service.js";

/**
 * Byreal (Solana DEX) HTTP routes:
 *   GET /byreal/pools    normalized pool list { poolAddress, pair, tvl, apr, volume24h }
 *   GET /byreal/tokens   normalized token/mint discovery list
 *
 * Reads/quotes only — live LP execution is Solana-side and out of MVP scope.
 * Both responses use the shared { success, data, error } envelope and surface
 * upstream failures as 502 via the global error handler.
 */
export async function byrealRoutes(app: FastifyInstance): Promise<void> {
  app.get("/byreal/pools", async (req) => {
    const query = parse(byrealPoolsQuerySchema, req.query);
    return ok(await byrealService.pools(query));
  });

  app.get("/byreal/tokens", async (req) => {
    const query = parse(byrealTokensQuerySchema, req.query);
    return ok(await byrealService.tokens(query));
  });
}
