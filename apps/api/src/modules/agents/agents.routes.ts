import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import {
  PaginationQuerySchema,
  toPaginationArgs,
} from "../../lib/pagination.js";
import { decisionsService } from "../decisions/decisions.service.js";
import { reputationService } from "../reputation/reputation.service.js";
import { agentsService } from "./agents.service.js";
import {
  agentIdParamSchema,
  createAgentSchema,
  listAgentsQuerySchema,
} from "./agents.schema.js";
import { runDemoForAgentSchema } from "../execution/execution.schema.js";
import { executionService } from "../execution/execution.service.js";

/**
 * Agents (Spartans) HTTP routes — plan.md §16:
 *   GET  /agents
 *   GET  /agents/:id
 *   POST /agents          (create off-chain mirror)
 *   POST /agents/sync     (reconcile with chain)
 *   POST /agents/:id/run-demo
 *   GET  /agents/:id/decisions   (War Chronicle for one Spartan)
 *   GET  /agents/:id/reputation  (Honor)
 */
export async function agentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agents", async (req) => {
    const query = parse(listAgentsQuerySchema, req.query);
    const page = toPaginationArgs(parse(PaginationQuerySchema, req.query));
    const filter = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.owner ? { ownerWallet: query.owner.toLowerCase() } : {}),
      ...(query.skill ? { skill: query.skill } : {}),
    };
    const { items, meta } = await agentsService.list(filter, page);
    return ok(items, meta);
  });

  app.get("/agents/:id", async (req) => {
    const { id } = parse(agentIdParamSchema, req.params);
    return ok(await agentsService.getByIdentifier(id));
  });

  app.post("/agents", async (req, reply) => {
    const body = parse(createAgentSchema, req.body);
    const agent = await agentsService.create(body);
    return reply.code(201).send(ok(agent));
  });

  app.post("/agents/sync", async () => ok(await agentsService.sync()));

  app.post("/agents/:id/run-demo", async (req) => {
    const { id } = parse(agentIdParamSchema, req.params);
    const body = parse(runDemoForAgentSchema, req.body ?? {});
    return ok(await executionService.runDemoForAgent(id, body));
  });

  app.get("/agents/:id/decisions", async (req) => {
    const { id } = parse(agentIdParamSchema, req.params);
    const page = toPaginationArgs(parse(PaginationQuerySchema, req.query));
    const { items, meta } = await decisionsService.listForAgent(id, page);
    return ok(items, meta);
  });

  app.get("/agents/:id/reputation", async (req) => {
    const { id } = parse(agentIdParamSchema, req.params);
    return ok(await reputationService.getForAgent(id));
  });
}
