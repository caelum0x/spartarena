import type { FastifyInstance } from "fastify";
import { ok } from "../../lib/errors.js";
import { PaginationQuerySchema, toPaginationArgs } from "../../lib/pagination.js";
import { parse } from "../../lib/validate.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "./projects.schema.js";
import { projectsService } from "./projects.service.js";
import { createTaskSchema } from "../tasks/tasks.schema.js";
import { tasksService } from "../tasks/tasks.service.js";

/** Protocol Projects group multiple Battles under one sponsor workstream. */
export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects", async (req) => {
    const query = parse(listProjectsQuerySchema, req.query);
    const page = toPaginationArgs(parse(PaginationQuerySchema, req.query));
    const filter = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.sponsor ? { sponsorWallet: query.sponsor.toLowerCase() } : {}),
      ...(query.skill ? { skill: query.skill } : {}),
    };
    const { items, meta } = await projectsService.list(filter, page);
    return ok(items, meta);
  });

  app.get("/projects/:id", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.getByIdentifier(id));
  });

  app.get("/projects/:id/matches", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.matches(id));
  });

  app.get("/projects/:id/recommendations", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.recommendations(id));
  });

  app.get("/projects/:id/chronicle", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.chronicle(id));
  });

  app.get("/projects/:id/budget", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.budget(id));
  });

  app.get("/projects/:id/risks", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.risks(id));
  });

  app.get("/projects/:id/readiness", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    return ok(await projectsService.readiness(id));
  });

  app.post("/projects", async (req, reply) => {
    const body = parse(createProjectSchema, req.body);
    const project = await projectsService.create(body);
    return reply.code(201).send(ok(project));
  });

  app.patch("/projects/:id", async (req) => {
    const { id } = parse(projectIdParamSchema, req.params);
    const body = parse(updateProjectSchema, req.body);
    return ok(await projectsService.update(id, body));
  });

  app.post("/projects/:id/battles", async (req, reply) => {
    const { id } = parse(projectIdParamSchema, req.params);
    const project = await projectsService.getByIdentifier(id);
    const body = parse(createTaskSchema, req.body);
    const battle = await tasksService.create({ ...body, projectId: project.id });
    return reply.code(201).send(ok(battle));
  });
}
