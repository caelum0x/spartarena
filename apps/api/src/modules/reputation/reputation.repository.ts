import type { Prisma, ReputationScore } from "@prisma/client";
import { prisma } from "../../db.js";

/** Data-access layer for reputation (Honor) scoring events. */
export const reputationRepository = {
  create(data: Prisma.ReputationScoreCreateInput): Promise<ReputationScore> {
    return prisma.reputationScore.create({ data });
  },

  /** All scoring events for a Spartan by on-chain agent id, newest first. */
  listForChainAgent(chainAgentId: number): Promise<ReputationScore[]> {
    return prisma.reputationScore.findMany({
      where: { chainAgentId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Leaderboard rows: latest total score per on-chain agent id. Uses a grouped
   * aggregate over averages so the Hall of Glory reflects sustained performance,
   * not a single lucky Battle.
   */
  async leaderboardAggregates(): Promise<
    Array<{
      chainAgentId: number;
      avgTotal: number;
      battles: number;
    }>
  > {
    const grouped = await prisma.reputationScore.groupBy({
      by: ["chainAgentId"],
      _avg: { totalScore: true },
      _count: { _all: true },
    });
    return grouped.map((g) => ({
      chainAgentId: g.chainAgentId,
      avgTotal: Math.round(g._avg.totalScore ?? 0),
      battles: g._count._all,
    }));
  },
};
