import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { demoService } from "./demo.service.js";

/**
 * Demo HTTP routes — plan.md §16:
 *   POST /demo/seed
 *   GET  /demo/status
 * (`/demo/run-alpha-agent` and `/demo/run-yield-agent` live in the execution
 * module.)
 */
export async function demoRoutes(app: FastifyInstance): Promise<void> {
  app.post("/demo/seed", async () => ok(await demoService.seed()));
  app.get("/demo/status", async () => ok(await demoService.status()));
}
