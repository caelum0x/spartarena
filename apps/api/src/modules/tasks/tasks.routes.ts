import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import {
  PaginationQuerySchema,
  toPaginationArgs,
} from "../../lib/pagination.js";
import { executionService } from "../execution/execution.service.js";
import { reputationService } from "../reputation/reputation.service.js";
import { tasksService } from "./tasks.service.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  verifyTaskSchema,
} from "./tasks.schema.js";

/**
 * Tasks (Battles) HTTP routes — plan.md §16:
 *   GET  /tasks
 *   GET  /tasks/:id
 *   POST /tasks            (create off-chain mirror)
 *   POST /tasks/sync       (reconcile with chain)
 *   POST /tasks/:id/execute  (queue agent run + decision proof)
 *   POST /tasks/:id/verify   (Oracle Judge scores + optional payment release)
 */
export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tasks", async (req) => {
    const query = parse(listTasksQuerySchema, req.query);
    const page = toPaginationArgs(parse(PaginationQuerySchema, req.query));
    const filter = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.creator ? { creatorWallet: query.creator.toLowerCase() } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };
    const { items, meta } = await tasksService.list(filter, page);
    return ok(items, meta);
  });

  app.get("/tasks/:id", async (req) => {
    const { id } = parse(taskIdParamSchema, req.params);
    return ok(await tasksService.getByIdentifier(id));
  });

  app.post("/tasks", async (req, reply) => {
    const body = parse(createTaskSchema, req.body);
    const task = await tasksService.create(body);
    return reply.code(201).send(ok(task));
  });

  app.post("/tasks/sync", async () => ok(await tasksService.sync()));

  app.post("/tasks/:id/execute", async (req) => {
    const { id } = parse(taskIdParamSchema, req.params);
    return ok(await executionService.executeTask(id));
  });

  app.post("/tasks/:id/verify", async (req) => {
    const { id } = parse(taskIdParamSchema, req.params);
    const scores = parse(verifyTaskSchema, req.body ?? {});
    return ok(await reputationService.verifyTask(id, scores));
  });
}
