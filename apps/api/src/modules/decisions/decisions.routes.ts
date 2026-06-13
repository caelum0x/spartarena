import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import {
  PaginationQuerySchema,
  toPaginationArgs,
} from "../../lib/pagination.js";
import { decisionsService } from "./decisions.service.js";
import {
  decisionIdParamSchema,
  listDecisionsQuerySchema,
} from "./decisions.schema.js";

/**
 * Decisions (War Chronicle) HTTP routes — plan.md §16:
 *   GET /decisions
 *   GET /decisions/:id
 * (`GET /agents/:id/decisions` lives in the agents module.)
 */
export async function decisionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/decisions", async (req) => {
    const query = parse(listDecisionsQuerySchema, req.query);
    const page = toPaginationArgs(parse(PaginationQuerySchema, req.query));
    const filter = {
      ...(query.actionType ? { actionType: query.actionType } : {}),
      ...(query.taskId !== undefined ? { chainTaskId: query.taskId } : {}),
      ...(query.agentId !== undefined ? { chainAgentId: query.agentId } : {}),
    };
    const { items, meta } = await decisionsService.list(filter, page);
    return ok(items, meta);
  });

  app.get("/decisions/:id", async (req) => {
    const { id } = parse(decisionIdParamSchema, req.params);
    return ok(await decisionsService.getById(id));
  });
}
