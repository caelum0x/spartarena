import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { reputationService } from "./reputation.service.js";
import { leaderboardQuerySchema } from "./reputation.schema.js";

/**
 * Reputation (Honor) HTTP routes — plan.md §16:
 *   GET  /leaderboard            (Hall of Glory)
 *   POST /reputation/recalculate
 * (`GET /agents/:id/reputation` lives in the agents module.)
 */
export async function reputationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/leaderboard", async (req) => {
    const { limit, sort } = parse(leaderboardQuerySchema, req.query);
    return ok(await reputationService.leaderboard(limit, sort));
  });

  app.post("/reputation/recalculate", async () =>
    ok(await reputationService.recalculate()),
  );
}
