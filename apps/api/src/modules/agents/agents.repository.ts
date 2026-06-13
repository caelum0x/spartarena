import type { Agent, AgentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { PaginationArgs } from "../../lib/pagination.js";

/**
 * Data-access layer for agents (Spartans).
 *
 * The repository encapsulates all Prisma access so the service depends on an
 * intent-revealing interface, not on query shapes. All methods return immutable
 * Prisma rows; callers never mutate them in place.
 */
export interface AgentFilter {
  readonly status?: AgentStatus;
  readonly ownerWallet?: string;
  readonly skill?: string;
}

function buildWhere(filter: AgentFilter): Prisma.AgentWhereInput {
  const where: Prisma.AgentWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.ownerWallet) where.ownerWallet = filter.ownerWallet;
  if (filter.skill) where.skills = { has: filter.skill };
  return where;
}

export const agentsRepository = {
  async list(
    filter: AgentFilter,
    page: PaginationArgs,
  ): Promise<{ rows: Agent[]; total: number }> {
    const where = buildWhere(filter);
    const [rows, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
      }),
      prisma.agent.count({ where }),
    ]);
    return { rows, total };
  },

  findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { id } });
  },

  findByChainId(chainAgentId: number): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { chainAgentId } });
  },

  findBySlug(slug: string): Promise<Agent | null> {
    return prisma.agent.findUnique({ where: { slug } });
  },

  create(data: Prisma.AgentCreateInput): Promise<Agent> {
    return prisma.agent.create({ data });
  },

  /** Upsert by on-chain id — used by the indexer when a registration is seen. */
  upsertByChainId(
    chainAgentId: number,
    create: Prisma.AgentCreateInput,
    update: Prisma.AgentUpdateInput,
  ): Promise<Agent> {
    return prisma.agent.upsert({
      where: { chainAgentId },
      create: { ...create, chainAgentId },
      update,
    });
  },
};
