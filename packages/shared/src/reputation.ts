/**
 * Reputation (Honor) modelling for SpartArena.
 *
 * Mirrors ReputationEngine on-chain. Each completed Battle contributes four
 * 0-100 sub-scores; the weighted total ("Glory") uses the same weights as the
 * contract: accuracy 40, safety 30, speed 15, user 15 (summing to 100).
 */

/** Weights applied to each reputation component. Must sum to 100. */
export const REPUTATION_WEIGHTS = {
  accuracy: 40,
  safety: 30,
  speed: 15,
  userRating: 15,
} as const;

export type ReputationComponent = keyof typeof REPUTATION_WEIGHTS;

/** Sum of all weights — kept as a constant for total normalisation. */
export const REPUTATION_WEIGHT_TOTAL: number = Object.values(
  REPUTATION_WEIGHTS,
).reduce((sum, w) => sum + w, 0);

/**
 * A reputation record. Component scores are 0-100 averages across all scored
 * Battles. `totalTasks` and `totalEarnings` mirror the on-chain counters;
 * `totalEarnings` is the cumulative MNT earned in wei.
 */
export interface Reputation {
  readonly agentId: number;
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
  readonly totalTasks: number;
  /** Cumulative earnings in wei (native MNT). */
  readonly totalEarnings: bigint;
}

/** Clamp a value into the inclusive 0-100 score range. */
function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** A subset of {@link Reputation} carrying just the four scored components. */
export type ReputationComponents = Pick<Reputation, ReputationComponent>;

/**
 * Computes the weighted total Glory score (0-100) from component sub-scores.
 * Each component is clamped to 0-100 before weighting, matching the contract's
 * bounded inputs. Returns a rounded integer.
 */
export function computeTotalScore(components: ReputationComponents): number {
  const weighted =
    clampScore(components.accuracy) * REPUTATION_WEIGHTS.accuracy +
    clampScore(components.safety) * REPUTATION_WEIGHTS.safety +
    clampScore(components.speed) * REPUTATION_WEIGHTS.speed +
    clampScore(components.userRating) * REPUTATION_WEIGHTS.userRating;

  return Math.round(weighted / REPUTATION_WEIGHT_TOTAL);
}

/** Empty/zeroed reputation for a freshly registered Spartan. */
export function emptyReputation(agentId: number): Reputation {
  return {
    agentId,
    accuracy: 0,
    safety: 0,
    speed: 0,
    userRating: 0,
    totalTasks: 0,
    totalEarnings: 0n,
  };
}

/** Honor tiers derived from the total Glory score, for leaderboard badges. */
export type HonorTier = "Recruit" | "Hoplite" | "Champion" | "Legend";

export function honorTier(totalScore: number): HonorTier {
  const score = clampScore(totalScore);
  if (score >= 90) return "Legend";
  if (score >= 75) return "Champion";
  if (score >= 50) return "Hoplite";
  return "Recruit";
}
