import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { executionService } from "./execution.service.js";
import { runAgentSchema } from "./execution.schema.js";

/**
 * Execution HTTP routes.
 *
 * The primary `POST /tasks/:id/execute` lives in the tasks module; this module
 * exposes the demo run endpoints (plan.md §16):
 *   POST /demo/run-alpha-agent
 *   POST /demo/run-yield-agent
 * The full `/demo/*` suite (seed, status) is registered by the demo module.
 */
export async function executionRoutes(app: FastifyInstance): Promise<void> {
  app.post("/demo/run-alpha-agent", async (req) => {
    const body = parse(runAgentSchema, req.body ?? {});
    const opts = {
      ...(body.taskId ? { taskId: body.taskId } : {}),
      ...(body.description ? { description: body.description } : {}),
    };
    return ok(await executionService.runNamedAgent("AlphaSentinel", opts));
  });

  app.post("/demo/run-yield-agent", async (req) => {
    const body = parse(runAgentSchema, req.body ?? {});
    const opts = {
      ...(body.taskId ? { taskId: body.taskId } : {}),
      ...(body.description ? { description: body.description } : {}),
    };
    return ok(await executionService.runNamedAgent("YieldStrategist", opts));
  });
}
