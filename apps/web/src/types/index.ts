/**
 * View-model types for the SpartArena web app.
 *
 * These are the denormalised, render-ready shapes the UI consumes. They are
 * derived from (but distinct from) the on-chain decode types in `@spartarena/sdk`
 * so we can attach off-chain metadata (names, avatars, summaries) and keep the
 * UI ergonomic. All numeric on-chain quantities that can exceed 2^53 are carried
 * as strings (wei, unix-seconds) to survive JSON transport from the API.
 */
import type { TaskStatus } from "@spartarena/sdk";
import type { HonorTier } from "@spartarena/shared";

export type { TaskStatus, HonorTier };

/** A registered Spartan (agent) as shown across the Arena. */
export interface AgentView {
  readonly agentId: number;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
  readonly agentWallet: string;
  readonly model: string;
  readonly skills: readonly string[];
  readonly avatarUrl?: string;
  readonly repoUrl?: string;
  readonly metadataURI: string;
  readonly skillsHash: string;
  /** Cumulative weighted Glory score, 0-100. */
  readonly glory: number;
  readonly honorTier: HonorTier;
  readonly completedTasks: number;
  /** Cumulative earnings in wei (base-10 string). */
  readonly totalEarnedWei: string;
  readonly createdAt: number;
  readonly active: boolean;
}

/** Per-component reputation breakdown for an agent. */
export interface ReputationView {
  readonly agentId: number;
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
  readonly total: number;
  readonly completedTasks: number;
  readonly totalEarnedWei: string;
}

/** A Battle (task) in the Arena. */
export interface TaskView {
  readonly taskId: number;
  readonly title: string;
  readonly description: string;
  readonly creator: string;
  readonly assignedAgentId: number;
  readonly assignedAgentName?: string;
  /** Reward locked in the Battle Vault, in wei (base-10 string). */
  readonly rewardWei: string;
  readonly descriptionHash: string;
  readonly resultHash?: string;
  readonly status: TaskStatus;
  readonly requiredSkill?: string;
  readonly createdAt: number;
  readonly deadline: number;
}

/** A Battle preview inside a sponsor Project returned by the API. */
export interface ProjectBattleView {
  readonly id: string;
  readonly chainTaskId: number | null;
  readonly projectId: string | null;
  readonly title: string;
  readonly description: string;
  readonly descriptionHash: string;
  readonly requiredSkill: string | null;
  readonly creatorWallet: string;
  readonly assignedAgentId: string | null;
  readonly rewardWei: string;
  readonly status: string;
  readonly statusCode: number;
  readonly deadline: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A sponsor workstream that groups multiple Battles. */
export interface ProjectView {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly sponsorWallet: string;
  readonly treasuryWei: string;
  readonly status: "PLANNING" | "ACTIVE" | "SETTLED" | "ARCHIVED";
  readonly requiredSkills: readonly string[];
  readonly deadline: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly battleCount: number;
  readonly openBattleCount: number;
  readonly completedBattleCount: number;
  readonly progressPct: number;
  readonly totalRewardWei: string;
  readonly remainingTreasuryWei: string;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH";
  readonly lastActivityAt: string;
  readonly battles: readonly ProjectBattleView[];
}

export type ProjectStatusView = ProjectView["status"];

/** Project budget allocation and coverage summary. */
export interface ProjectBudgetStatusView {
  readonly status: string;
  readonly battleCount: number;
  readonly rewardWei: string;
}

export interface ProjectBudgetSkillView {
  readonly skill: string;
  readonly battleCount: number;
  readonly rewardWei: string;
  readonly covered: boolean;
}

export interface ProjectBudgetView {
  readonly projectId: string;
  readonly treasuryWei: string;
  readonly allocatedWei: string;
  readonly remainingWei: string;
  readonly openWei: string;
  readonly activeWei: string;
  readonly completedWei: string;
  readonly coveragePct: number;
  readonly runwayBattleCount: number;
  readonly oversubscribed: boolean;
  readonly statusBreakdown: readonly ProjectBudgetStatusView[];
  readonly skillBreakdown: readonly ProjectBudgetSkillView[];
}

/** Project risk register item derived from deadline, treasury, coverage and execution state. */
export interface ProjectRiskView {
  readonly id: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH";
  readonly category: "DEADLINE" | "TREASURY" | "COVERAGE" | "EXECUTION" | "SETTLEMENT";
  readonly title: string;
  readonly description: string;
  readonly suggestedAction: string;
  readonly actionType:
    | "ADD_BATTLE"
    | "UPDATE_PROJECT"
    | "FIND_SPARTANS"
    | "REVIEW_CHRONICLE"
    | "VERIFY_BATTLE";
  readonly requiredSkill: string | null;
  readonly battleId: string | null;
  readonly chainTaskId: number | null;
  readonly detectedAt: string;
}

export interface ProjectReadinessCheckView {
  readonly id: string;
  readonly label: string;
  readonly complete: boolean;
  readonly detail: string;
}

export interface ProjectReadinessBlockerView {
  readonly id: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH";
  readonly label: string;
  readonly detail: string;
  readonly actionType: ProjectRiskView["actionType"];
  readonly requiredSkill: string | null;
  readonly chainTaskId: number | null;
}

/** Settlement readiness summary for sponsor closeout decisions. */
export interface ProjectReadinessView {
  readonly projectId: string;
  readonly scorePct: number;
  readonly readyToSettle: boolean;
  readonly readyToArchive: boolean;
  readonly summary: string;
  readonly nextAction: string;
  readonly completedBattleCount: number;
  readonly unsettledBattleCount: number;
  readonly blockers: readonly ProjectReadinessBlockerView[];
  readonly checklist: readonly ProjectReadinessCheckView[];
}

/** Project-level proof and Battle activity, newest first. */
export interface ProjectChronicleEventView {
  readonly id: string;
  readonly type: "PROJECT_CREATED" | "BATTLE_CREATED" | "BATTLE_STATUS" | "DECISION_RECORDED";
  readonly title: string;
  readonly description: string;
  readonly battleId: string | null;
  readonly battleTitle: string | null;
  readonly chainTaskId: number | null;
  readonly decisionId: string | null;
  readonly chainDecisionId: number | null;
  readonly actionType: string | null;
  readonly confidence: number | null;
  readonly riskScore: number | null;
  readonly txHash: string | null;
  readonly timestamp: string;
}

/** Draft Battle recommended for a Project's missing skill coverage or risk. */
export interface ProjectRecommendationView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requiredSkill: string | null;
  readonly rewardWei: string;
  readonly deadlineDays: number;
  readonly priority: "LOW" | "MEDIUM" | "HIGH";
  readonly rationale: string;
}

/** Recommended Spartan for a Project, scored by skill coverage and Honor history. */
export interface ProjectMatchView {
  readonly agentId: string;
  readonly chainAgentId: number | null;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly agentWallet: string;
  readonly skills: readonly string[];
  readonly matchedSkills: readonly string[];
  readonly missingSkills: readonly string[];
  readonly skillMatchPct: number;
  readonly reputationScore: number;
  readonly completedBattles: number;
  readonly matchScore: number;
  readonly reason: string;
}

/** A War Chronicle entry — a recorded, hash-committed decision. */
export interface DecisionView {
  readonly decisionId: number;
  readonly agentId: number;
  readonly agentName?: string;
  readonly taskId: number;
  readonly promptHash: string;
  readonly outputHash: string;
  readonly toolsHash: string;
  readonly confidence: number;
  readonly riskScore: number;
  readonly actionType: string;
  readonly summary?: string;
  readonly humanExplanation?: string;
  readonly txHash?: string;
  readonly timestamp: number;
  /**
   * Structured findings for a CONTRACT_AUDIT decision, when the backend attaches
   * the off-chain audit body. Absent for other decision types (or when not yet
   * surfaced) — render gracefully when missing.
   */
  readonly findings?: readonly AuditFindingView[];
  /** Audited contract address for a CONTRACT_AUDIT decision, when present. */
  readonly target?: string;
}

/** One row in the Hall of Glory. */
export interface LeaderboardEntry {
  readonly rank: number;
  readonly agentId: number;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly glory: number;
  readonly honorTier: HonorTier;
  readonly completedTasks: number;
  readonly totalEarnedWei: string;
  readonly accuracy: number;
  readonly safety: number;
  readonly speed: number;
  readonly userRating: number;
}

/**
 * A Spartan's War Chest (bond) from `GET /agents/:id/staking`. Bond is wei
 * (base-10 string). `available` is false when staking isn't configured on-chain.
 */
export interface AgentStakingView {
  readonly agentId: string;
  /** Posted bond, in wei (base-10 string). */
  readonly bond: string;
  readonly isActive: boolean;
  readonly available: boolean;
}

/**
 * A Byreal liquidity pool surfaced by the backend `GET /byreal/pools`.
 *
 * Derived from the real `ByrealSkillAdapter.analyzePool` result; money values are
 * already numeric USD (the backend normalises Byreal's string amounts). `proof`
 * carries the ByrealPoolAnalyst decision-proof when the analysis was recorded.
 */
export interface ByrealPoolView {
  readonly poolAddress: string;
  readonly pairLabel: string;
  /** Constituent mint addresses, when known (used to cross-link token ↔ pools). */
  readonly mintA?: string;
  readonly mintB?: string;
  /** Total value locked, in USD. */
  readonly tvlUsd: number;
  /** Trailing 24h trading volume, in USD. */
  readonly volume24hUsd: number;
  /** Pool fee in basis points (e.g. 30 = 0.30%). */
  readonly feeBps?: number;
  /** Estimated annualized fee APR as a percentage. */
  readonly estimatedAprPct: number;
  /** Pool utilization (volume/TVL) as a percentage. */
  readonly utilizationPct?: number;
  /** 0-100 risk score; higher means riskier. */
  readonly riskScore?: number;
  /** 0-100 confidence in the analysis. */
  readonly confidence?: number;
  readonly signals?: readonly string[];
  readonly humanSummary?: string;
  /** Backend-flagged best pick of the current set. */
  readonly topPick?: boolean;
  /** ByrealPoolAnalyst decision-proof, when present. */
  readonly proof?: {
    readonly toolProofHash: string;
    readonly recordedOnMantle: boolean;
  };
}

/**
 * A Byreal token surfaced by the ByrealPoolAnalyst's discovery skill, served by
 * the same-origin `/api/byreal/tokens` route. Scores are 0-100. The set's top
 * pick carries the verifiable discovery proof.
 */
export interface ByrealTokenView {
  readonly mint: string;
  readonly symbol: string;
  readonly name: string;
  /** Spot price in USD, or null when Byreal reports none. */
  readonly priceUsd: number | null;
  readonly volume24hUsd: number;
  readonly marketCapUsd: number | null;
  /** Signed 24h price change, in percent. */
  readonly priceChange24hPct: number;
  /** 0-100 blended liquidity depth score; higher is deeper. */
  readonly liquidityScore: number;
  /** 0-100 risk score; higher means riskier. */
  readonly riskScore: number;
  readonly reason: string;
  /** Flagged best risk-adjusted pick of the current set. */
  readonly topPick?: boolean;
  /** ByrealPoolAnalyst discovery proof, attached to the top pick. */
  readonly proof?: {
    readonly toolProofHash: string;
    readonly recordedOnMantle: boolean;
  };
}

/**
 * A non-executable Byreal (Solana) swap quote preview from the same-origin
 * `/api/byreal/swap-preview` route. Amounts are decimal strings in token units.
 */
export interface ByrealSwapPreview {
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly amountIn: string;
  readonly expectedAmountOut: string;
  readonly minAmountOut: string;
  readonly executionPrice: number;
  readonly priceImpactPct: number;
  readonly route: readonly string[];
  readonly slippageBps: number;
  readonly riskScore: number;
  readonly humanSummary: string;
  readonly proof: {
    readonly toolProofHash: string;
    readonly recordedOnMantle: boolean;
  };
}

/**
 * Backend notification channel configuration, from `GET /notifications/status`.
 * Each flag is true when that channel's credentials are configured server-side
 * and alerts will be delivered. Optional fields tolerate channels the backend
 * may add later.
 */
export interface NotificationStatusView {
  readonly telegram: boolean;
  readonly discord: boolean;
}

/** A single audit finding surfaced in a CONTRACT_AUDIT decision. */
export interface AuditFindingView {
  readonly severity: "info" | "low" | "medium" | "high" | "critical";
  readonly title: string;
  readonly detail: string;
}

/** Standard API envelope returned by @spartarena/api. */
export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly meta?: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
  };
}
