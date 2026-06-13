import type { Prisma, Project, ProjectStatus, Task } from "@prisma/client";
import { prisma } from "../../db.js";
import type { PaginationArgs } from "../../lib/pagination.js";

export interface ProjectFilter {
  readonly status?: ProjectStatus;
  readonly sponsorWallet?: string;
  readonly skill?: string;
}

export type ProjectWithTasks = Project & { readonly tasks: readonly Task[] };

function buildWhere(filter: ProjectFilter): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.sponsorWallet) where.sponsorWallet = filter.sponsorWallet;
  if (filter.skill) where.requiredSkills = { has: filter.skill };
  return where;
}

const taskPreview = {
  orderBy: { createdAt: "desc" as const },
  take: 6,
};

const projectTasks = {
  orderBy: { createdAt: "desc" as const },
};

export const projectsRepository = {
  async list(
    filter: ProjectFilter,
    page: PaginationArgs,
  ): Promise<{ rows: ProjectWithTasks[]; total: number }> {
    const where = buildWhere(filter);
    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: { tasks: taskPreview },
        orderBy: { updatedAt: "desc" },
        skip: page.skip,
        take: page.take,
      }),
      prisma.project.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string): Promise<ProjectWithTasks | null> {
    return prisma.project.findUnique({ where: { id }, include: { tasks: projectTasks } });
  },

  findBySlug(slug: string): Promise<ProjectWithTasks | null> {
    return prisma.project.findUnique({ where: { slug }, include: { tasks: projectTasks } });
  },

  create(data: Prisma.ProjectCreateInput): Promise<ProjectWithTasks> {
    return prisma.project.create({ data, include: { tasks: projectTasks } });
  },

  update(id: string, data: Prisma.ProjectUpdateInput): Promise<ProjectWithTasks> {
    return prisma.project.update({ where: { id }, data, include: { tasks: projectTasks } });
  },
};
