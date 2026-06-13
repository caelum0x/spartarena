import type { ActionType, Decision, Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { PaginationArgs } from "../../lib/pagination.js";

/** Data-access layer for decisions (War Chronicle entries). */
export interface DecisionFilter {
  readonly actionType?: ActionType;
  readonly chainTaskId?: number;
  readonly chainAgentId?: number;
}

function buildWhere(filter: DecisionFilter): Prisma.DecisionWhereInput {
  const where: Prisma.DecisionWhereInput = {};
  if (filter.actionType) where.actionType = filter.actionType;
  if (filter.chainTaskId !== undefined) where.chainTaskId = filter.chainTaskId;
  if (filter.chainAgentId !== undefined) where.chainAgentId = filter.chainAgentId;
  return where;
}

export const decisionsRepository = {
  async list(
    filter: DecisionFilter,
    page: PaginationArgs,
  ): Promise<{ rows: Decision[]; total: number }> {
    const where = buildWhere(filter);
    const [rows, total] = await Promise.all([
      prisma.decision.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
      }),
      prisma.decision.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string): Promise<Decision | null> {
    return prisma.decision.findUnique({ where: { id } });
  },

  findByChainId(chainDecisionId: number): Promise<Decision | null> {
    return prisma.decision.findUnique({ where: { chainDecisionId } });
  },

  listForTaskIds(taskIds: readonly string[]): Promise<Decision[]> {
    if (taskIds.length === 0) return Promise.resolve([]);
    return prisma.decision.findMany({
      where: { taskId: { in: [...taskIds] } },
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.DecisionCreateInput): Promise<Decision> {
    return prisma.decision.create({ data });
  },

  upsertByChainId(
    chainDecisionId: number,
    create: Prisma.DecisionCreateInput,
    update: Prisma.DecisionUpdateInput,
  ): Promise<Decision> {
    return prisma.decision.upsert({
      where: { chainDecisionId },
      create: { ...create, chainDecisionId },
      update,
    });
  },

  /**
   * Stream cursor query for the live War Chronicle feed.
   *
   * Returns newly-indexed decisions strictly after `cursor` (a `[createdAt, id]`
   * pair), ordered oldest-first so the SSE consumer receives them in causal
   * order and can advance its cursor monotonically. The `id` tiebreaker keeps
   * pagination stable when multiple decisions share a `createdAt`.
   */
  listSince(
    cursor: { createdAt: Date; id: string } | null,
    take: number,
  ): Promise<Decision[]> {
    const where: Prisma.DecisionWhereInput = cursor
      ? {
          OR: [
            { createdAt: { gt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { gt: cursor.id } },
          ],
        }
      : {};
    return prisma.decision.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take,
    });
  },
};
