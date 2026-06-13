import { honorTier } from "@spartarena/shared";
import { formatEther } from "viem";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { childLogger } from "../../lib/logger.js";
import { canSubmitScores } from "../../env.js";
import { resolveAgent } from "../agents/agents.service.js";
import { resolveTask } from "../tasks/tasks.service.js";
import { tasksRepository } from "../tasks/tasks.repository.js";
import {
  readReputation,
  readDecisionsOfAgent,
  readBond,
  readAgentActive,
} from "../../chain/contractReads.js";
import {
  writeScore,
  writeVerifyTask,
  writeReleasePayment,
} from "../../chain/contractWrites.js";
import { reputationRepository } from "./reputation.repository.js";
import { totalFromComponents } from "./reputation.scorer.js";
import type { VerifyTaskInput } from "../tasks/tasks.schema.js";

/**
 * Business logic for reputation (Honor / Glory).
 *
 * Reads blend the on-chain ReputationEngine aggregate (source of truth) with the
 * Postgres scoring-event history. Verification records a scoring event, submits
 * it on-chain when a verifier signer is configured, optionally verifies/releases
 * the Battle on-chain, and updates the Battle's local status.
 */
const log = childLogger("reputation");

export interface ReputationDto {
  readonly agentId: string;
  readonly chainAgentId: number | null;
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
  readonly totalScore: number;
  readonly honorTier: string;
  readonly completedBattles: number;
  readonly totalEarnedWei: string;
  readonly totalEarnedMnt: string;
  /** "chain" when sourced from ReputationEngine, "local" when from DB history. */
  readonly source: "chain" | "local";
}

export interface LeaderboardEntry {
  readonly rank: number;
  readonly agentId: string | null;
  readonly chainAgentId: number;
  readonly name: string | null;
  readonly totalScore: number;
  readonly honorTier: string;
  readonly completedBattles: number;
  /** On-chain war-chest bond in wei (degrades to "0" when chain is unavailable). */
  readonly bond: string;
  /** Whether the Spartan's bond meets the active threshold on-chain. */
  readonly isActive: boolean;
}

/** Ranking key for the Hall of Glory leaderboard. */
export type LeaderboardSort = "glory" | "bond";

/** Compare two wei bond strings for a descending sort (larger bond first). */
function compareBond(a: string, b: string): number {
  const av = BigInt(a);
  const bv = BigInt(b);
  if (av === bv) return 0;
  return av > bv ? -1 : 1;
}

/** Read bond + active flag for a chain agent id, degrading to "0"/false. */
async function readStakingForChainAgent(
  chainAgentId: number,
): Promise<{ bond: string; isActive: boolean }> {
  const [bond, active] = await Promise.all([
    readBond(BigInt(chainAgentId)),
    readAgentActive(BigInt(chainAgentId)),
  ]);
  return { bond: (bond ?? 0n).toString(), isActive: active ?? false };
}

export const reputationService = {
  async getForAgent(agentIdentifier: string): Promise<ReputationDto> {
    const agent = await resolveAgent(agentIdentifier);
    if (!agent) throw new NotFoundError("Spartan");

    // Prefer on-chain truth when available.
    if (agent.chainAgentId !== null) {
      const onChain = await readReputation(BigInt(agent.chainAgentId));
      if (onChain) {
        const total = Number(onChain.totalScore);
        return {
          agentId: agent.id,
          chainAgentId: agent.chainAgentId,
          accuracy: Number(onChain.accuracyScore),
          safety: Number(onChain.safetyScore),
          speed: Number(onChain.speedScore),
          userRating: Number(onChain.userRatingScore),
          totalScore: total,
          honorTier: honorTier(total),
          completedBattles: Number(onChain.completedTasks),
          totalEarnedWei: onChain.totalEarned.toString(),
          totalEarnedMnt: formatEther(onChain.totalEarned),
          source: "chain",
        };
      }
    }

    // Fall back to local scoring-event history.
    const events =
      agent.chainAgentId !== null
        ? await reputationRepository.listForChainAgent(agent.chainAgentId)
        : [];
    const count = events.length;
    const avg = (key: "accuracy" | "safety" | "speed" | "userRating"): number =>
      count === 0 ? 0 : Math.round(events.reduce((s, e) => s + e[key], 0) / count);
    const accuracy = avg("accuracy");
    const safety = avg("safety");
    const speed = avg("speed");
    const userRating = avg("userRating");
    const total = totalFromComponents({ accuracy, safety, speed, userRating });

    return {
      agentId: agent.id,
      chainAgentId: agent.chainAgentId,
      accuracy,
      safety,
      speed,
      userRating,
      totalScore: total,
      honorTier: honorTier(total),
      completedBattles: count,
      totalEarnedWei: "0",
      totalEarnedMnt: "0",
      source: "local",
    };
  },

  /**
   * Oracle Judge verification of a Battle: persist a scoring event, push it
   * on-chain when possible, and advance the Battle status.
   */
  async verifyTask(
    taskIdentifier: string,
    scores: VerifyTaskInput,
  ): Promise<{
    taskId: string;
    chainTaskId: number | null;
    accuracy: number;
    safety: number;
    speed: number;
    userRating: number;
    totalScore: number;
    scoreTxHash: string | null;
    verifyTxHash: string | null;
    releaseTxHash: string | null;
  }> {
    const task = await resolveTask(taskIdentifier);
    if (!task) throw new NotFoundError("Battle");
    if (task.assignedAgentId === null) {
      throw new ValidationError("Battle has no assigned Spartan to score");
    }

    const agent = await resolveAgent(task.assignedAgentId);
    if (!agent) throw new NotFoundError("Spartan");

    const totalScore = totalFromComponents(scores);

    // Persist the scoring event locally (always succeeds, demo-friendly).
    await reputationRepository.create({
      chainAgentId: agent.chainAgentId ?? 0,
      accuracy: scores.accuracy,
      safety: scores.safety,
      speed: scores.speed,
      userRating: scores.userRating,
      totalScore,
      ...(agent.id ? { agent: { connect: { id: agent.id } } } : {}),
    });

    let scoreTxHash: string | null = null;
    let verifyTxHash: string | null = null;
    let releaseTxHash: string | null = null;

    // Best-effort on-chain submission when verifier + chain ids are configured.
    if (
      canSubmitScores() &&
      agent.chainAgentId !== null &&
      task.chainTaskId !== null
    ) {
      try {
        scoreTxHash = await writeScore({
          agentId: BigInt(agent.chainAgentId),
          taskId: BigInt(task.chainTaskId),
          accuracy: BigInt(scores.accuracy),
          safety: BigInt(scores.safety),
          speed: BigInt(scores.speed),
          userRating: BigInt(scores.userRating),
        });
        verifyTxHash = await writeVerifyTask(BigInt(task.chainTaskId));
        if (scores.releasePayment) {
          releaseTxHash = await writeReleasePayment(BigInt(task.chainTaskId));
        }
      } catch (err) {
        log.warn({ err, taskId: task.id }, "On-chain verification partially failed");
      }
    }

    await tasksRepository.update(task.id, {
      status: scores.releasePayment ? "PAID" : "VERIFIED",
    });

    return {
      taskId: task.id,
      chainTaskId: task.chainTaskId,
      accuracy: scores.accuracy,
      safety: scores.safety,
      speed: scores.speed,
      userRating: scores.userRating,
      totalScore,
      scoreTxHash,
      verifyTxHash,
      releaseTxHash,
    };
  },

  /**
   * Hall of Glory leaderboard. Ranked by average Glory then battles by default,
   * or by on-chain war-chest bond when `sort: "bond"`. Each entry is enriched
   * with the Spartan's chain bond + active flag, degrading to "0"/false when the
   * chain is unconfigured or a read fails.
   */
  async leaderboard(
    limit: number,
    sort: LeaderboardSort = "glory",
  ): Promise<LeaderboardEntry[]> {
    const aggregates = await reputationRepository.leaderboardAggregates();
    const byGlory = [...aggregates].sort(
      (a, b) => b.avgTotal - a.avgTotal || b.battles - a.battles,
    );

    // When sorting by bond we must read chain bonds for the whole candidate set
    // before ranking; otherwise we only need the top `limit` rows.
    const candidates = sort === "bond" ? byGlory : byGlory.slice(0, limit);

    const enriched = await Promise.all(
      candidates.map(async (agg) => {
        const agent = await resolveAgent(String(agg.chainAgentId));
        const staking = await readStakingForChainAgent(agg.chainAgentId).catch(
          () => ({ bond: "0", isActive: false }),
        );
        return {
          agentId: agent?.id ?? null,
          chainAgentId: agg.chainAgentId,
          name: agent?.name ?? null,
          totalScore: agg.avgTotal,
          honorTier: honorTier(agg.avgTotal),
          completedBattles: agg.battles,
          bond: staking.bond,
          isActive: staking.isActive,
        };
      }),
    );

    const ranked =
      sort === "bond"
        ? enriched
            .sort((a, b) => compareBond(a.bond, b.bond) || b.totalScore - a.totalScore)
            .slice(0, limit)
        : enriched;

    return ranked.map((entry, index) => ({ rank: index + 1, ...entry }));
  },

  /**
   * Recalculate cached leaderboard aggregates. The current implementation is
   * stateless (aggregates are computed on read), so this confirms recomputation
   * and returns the fresh entry count.
   */
  async recalculate(): Promise<{ recalculated: number }> {
    const aggregates = await reputationRepository.leaderboardAggregates();
    return { recalculated: aggregates.length };
  },

  /** On-chain decision ids for a Spartan (used by chronicle cross-checks). */
  async chainDecisionIds(chainAgentId: number): Promise<number[]> {
    const ids = await readDecisionsOfAgent(BigInt(chainAgentId));
    return ids ? ids.map((i) => Number(i)) : [];
  },
};
