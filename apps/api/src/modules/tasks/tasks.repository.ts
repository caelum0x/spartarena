import type { Prisma, Task, TaskStatus } from "@prisma/client";
import { prisma } from "../../db.js";
import type { PaginationArgs } from "../../lib/pagination.js";

/**
 * Data-access layer for tasks (Battles). Encapsulates all Prisma queries so the
 * service depends on intent, not query structure.
 */
export interface TaskFilter {
  readonly status?: TaskStatus;
  readonly creatorWallet?: string;
  readonly projectId?: string;
}

function buildWhere(filter: TaskFilter): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.creatorWallet) where.creatorWallet = filter.creatorWallet;
  if (filter.projectId) where.projectId = filter.projectId;
  return where;
}

export const tasksRepository = {
  async list(
    filter: TaskFilter,
    page: PaginationArgs,
  ): Promise<{ rows: Task[]; total: number }> {
    const where = buildWhere(filter);
    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
      }),
      prisma.task.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({ where: { id } });
  },

  findByChainId(chainTaskId: number): Promise<Task | null> {
    return prisma.task.findUnique({ where: { chainTaskId } });
  },

  create(data: Prisma.TaskCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  },

  update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    return prisma.task.update({ where: { id }, data });
  },

  upsertByChainId(
    chainTaskId: number,
    create: Prisma.TaskCreateInput,
    update: Prisma.TaskUpdateInput,
  ): Promise<Task> {
    return prisma.task.upsert({
      where: { chainTaskId },
      create: { ...create, chainTaskId },
      update,
    });
  },
};
