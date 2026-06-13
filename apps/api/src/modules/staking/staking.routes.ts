import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { stakingAgentParamSchema } from "./staking.schema.js";
import { stakingService } from "./staking.service.js";

/**
 * Staking (war chest) HTTP routes:
 *   GET /agents/:id/staking   bond + active status for one Spartan
 *   GET /staking/overview     total bonded, min bond, treasury
 *
 * Writes (stake/unstake) are user wallet transactions performed client-side via
 * wagmi/the SDK; the API only exposes reads + indexes the on-chain events.
 */
export async function stakingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agents/:id/staking", async (req) => {
    const { id } = parse(stakingAgentParamSchema, req.params);
    return ok(await stakingService.forAgent(id));
  });

  app.get("/staking/overview", async () => ok(await stakingService.overview()));
}
