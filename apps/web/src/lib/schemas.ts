/**
 * Zod schemas for the render-ready view-models the web app consumes from the
 * `@spartarena/api` backend. These validate the `data` payload of every API
 * envelope at the trust boundary — external JSON is never trusted blindly.
 *
 * They intentionally mirror the interfaces in `@/types` but are permissive about
 * optional/extra fields the backend may add. On-chain quantities that can exceed
 * 2^53 (wei, unix-seconds where noted) travel as base-10 strings.
 */
import { z } from "zod";
import { TaskStatus } from "@spartarena/sdk";

/** A base-10 unsigned integer string (e.g. wei). */
const numericString = z.string().regex(/^\d+$/, "expected a base-10 integer string");

/** Honor tier label, constrained to the shared {@link HonorTier} union. */
const honorTierSchema = z.enum(["Recruit", "Hoplite", "Champion", "Legend"]);

export const AgentViewSchema = z.object({
  agentId: z.number().int().nonnegative(),
  name: z.string(),
  description: z.string(),
  owner: z.string(),
  agentWallet: z.string(),
  model: z.string(),
  skills: z.array(z.string()),
  avatarUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  metadataURI: z.string(),
  skillsHash: z.string(),
  glory: z.number(),
  honorTier: honorTierSchema,
  completedTasks: z.number().int().nonnegative(),
  totalEarnedWei: numericString,
  createdAt: z.number(),
  active: z.boolean(),
});

export const ReputationViewSchema = z.object({
  agentId: z.number().int().nonnegative(),
  accuracy: z.number(),
  safety: z.number(),
  speed: z.number(),
  userRating: z.number(),
  total: z.number(),
  completedTasks: z.number().int().nonnegative(),
  totalEarnedWei: numericString,
});

export const TaskViewSchema = z.object({
  taskId: z.number().int().nonnegative(),
  title: z.string(),
  description: z.string(),
  creator: z.string(),
  assignedAgentId: z.number().int().nonnegative(),
  assignedAgentName: z.string().optional(),
  rewardWei: numericString,
  descriptionHash: z.string(),
  resultHash: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  requiredSkill: z.string().optional(),
  createdAt: z.number(),
  deadline: z.number(),
});

export const ProjectBattleSchema = z.object({
  id: z.string(),
  chainTaskId: z.number().int().nonnegative().nullable(),
  projectId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  descriptionHash: z.string(),
  requiredSkill: z.string().nullable(),
  creatorWallet: z.string(),
  assignedAgentId: z.string().nullable(),
  rewardWei: numericString,
  status: z.string(),
  statusCode: z.number().int().nonnegative(),
  deadline: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  sponsorWallet: z.string(),
  treasuryWei: numericString,
  status: z.enum(["PLANNING", "ACTIVE", "SETTLED", "ARCHIVED"]),
  requiredSkills: z.array(z.string()),
  deadline: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  battleCount: z.number().int().nonnegative(),
  openBattleCount: z.number().int().nonnegative(),
  completedBattleCount: z.number().int().nonnegative(),
  progressPct: z.number().int().min(0).max(100),
  totalRewardWei: numericString,
  remainingTreasuryWei: numericString,
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  lastActivityAt: z.string(),
  battles: z.array(ProjectBattleSchema),
});

export const ProjectMatchSchema = z.object({
  agentId: z.string(),
  chainAgentId: z.number().int().nonnegative().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  agentWallet: z.string(),
  skills: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  skillMatchPct: z.number().int().min(0).max(100),
  reputationScore: z.number().int().min(0).max(100),
  completedBattles: z.number().int().nonnegative(),
  matchScore: z.number().int().min(0).max(100),
  reason: z.string(),
});

export const ProjectBudgetSchema = z.object({
  projectId: z.string(),
  treasuryWei: numericString,
  allocatedWei: numericString,
  remainingWei: numericString,
  openWei: numericString,
  activeWei: numericString,
  completedWei: numericString,
  coveragePct: z.number().int().min(0).max(100),
  runwayBattleCount: z.number().int().nonnegative(),
  oversubscribed: z.boolean(),
  statusBreakdown: z.array(
    z.object({
      status: z.string(),
      battleCount: z.number().int().nonnegative(),
      rewardWei: numericString,
    }),
  ),
  skillBreakdown: z.array(
    z.object({
      skill: z.string(),
      battleCount: z.number().int().nonnegative(),
      rewardWei: numericString,
      covered: z.boolean(),
    }),
  ),
});

export const ProjectRiskSchema = z.object({
  id: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  category: z.enum(["DEADLINE", "TREASURY", "COVERAGE", "EXECUTION", "SETTLEMENT"]),
  title: z.string(),
  description: z.string(),
  suggestedAction: z.string(),
  actionType: z.enum([
    "ADD_BATTLE",
    "UPDATE_PROJECT",
    "FIND_SPARTANS",
    "REVIEW_CHRONICLE",
    "VERIFY_BATTLE",
  ]),
  requiredSkill: z.string().nullable(),
  battleId: z.string().nullable(),
  chainTaskId: z.number().int().nonnegative().nullable(),
  detectedAt: z.string(),
});

export const ProjectReadinessSchema = z.object({
  projectId: z.string(),
  scorePct: z.number().int().min(0).max(100),
  readyToSettle: z.boolean(),
  readyToArchive: z.boolean(),
  summary: z.string(),
  nextAction: z.string(),
  completedBattleCount: z.number().int().nonnegative(),
  unsettledBattleCount: z.number().int().nonnegative(),
  blockers: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
      label: z.string(),
      detail: z.string(),
      actionType: z.enum([
        "ADD_BATTLE",
        "UPDATE_PROJECT",
        "FIND_SPARTANS",
        "REVIEW_CHRONICLE",
        "VERIFY_BATTLE",
      ]),
      requiredSkill: z.string().nullable(),
      chainTaskId: z.number().int().nonnegative().nullable(),
    }),
  ),
  checklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      complete: z.boolean(),
      detail: z.string(),
    }),
  ),
});

export const ProjectChronicleEventSchema = z.object({
  id: z.string(),
  type: z.enum(["PROJECT_CREATED", "BATTLE_CREATED", "BATTLE_STATUS", "DECISION_RECORDED"]),
  title: z.string(),
  description: z.string(),
  battleId: z.string().nullable(),
  battleTitle: z.string().nullable(),
  chainTaskId: z.number().int().nonnegative().nullable(),
  decisionId: z.string().nullable(),
  chainDecisionId: z.number().int().nonnegative().nullable(),
  actionType: z.string().nullable(),
  confidence: z.number().int().min(0).max(100).nullable(),
  riskScore: z.number().int().min(0).max(100).nullable(),
  txHash: z.string().nullable(),
  timestamp: z.string(),
});

export const ProjectRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  requiredSkill: z.string().nullable(),
  rewardWei: numericString,
  deadlineDays: z.number().int().positive(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  rationale: z.string(),
});

export const DecisionViewSchema = z.object({
  decisionId: z.number().int().nonnegative(),
  agentId: z.number().int().nonnegative(),
  agentName: z.string().optional(),
  taskId: z.number().int().nonnegative(),
  promptHash: z.string(),
  outputHash: z.string(),
  toolsHash: z.string(),
  confidence: z.number(),
  riskScore: z.number(),
  actionType: z.string(),
  summary: z.string().optional(),
  humanExplanation: z.string().optional(),
  txHash: z.string().optional(),
  timestamp: z.number(),
  /**
   * Structured CONTRACT_AUDIT findings (off-chain audit body the backend may
   * attach). Optional and permissive so non-audit decisions validate unchanged.
   */
  findings: z
    .array(
      z.object({
        severity: z.enum(["info", "low", "medium", "high", "critical"]),
        title: z.string(),
        detail: z.string(),
      }),
    )
    .optional(),
  /** Audited contract address for CONTRACT_AUDIT decisions. */
  target: z.string().optional(),
});

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  agentId: z.number().int().nonnegative(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  glory: z.number(),
  honorTier: honorTierSchema,
  completedTasks: z.number().int().nonnegative(),
  totalEarnedWei: numericString,
  accuracy: z.number(),
  safety: z.number(),
  speed: z.number(),
  userRating: z.number(),
});

/**
 * A Spartan's "War Chest" (bond) as surfaced by `GET /agents/:id/staking`.
 * `bond` is wei (base-10 string). `available` is false when the AgentStaking
 * contract address is not configured on the backend.
 */
export const AgentStakingSchema = z.object({
  agentId: z.string(),
  bond: numericString,
  isActive: z.boolean(),
  available: z.boolean(),
});

/**
 * A Byreal liquidity pool as surfaced by the backend `GET /byreal/pools`.
 *
 * Mirrors the `ByrealSkillAdapter.analyzePool` result (packages/byreal-adapter)
 * plus a backend-attached `topPick` flag. The optional `proof` carries the
 * ByrealPoolAnalyst decision-proof: a keccak256 `toolProofHash` of the analysis
 * body and a `recordedOnMantle` flag. Permissive about extra fields the backend
 * may add; tolerant of `proof` being absent (e.g. when not yet recorded).
 */
export const ByrealPoolSchema = z.object({
  poolAddress: z.string(),
  pairLabel: z.string(),
  mintA: z.string().optional(),
  mintB: z.string().optional(),
  tvlUsd: z.number().nonnegative(),
  volume24hUsd: z.number().nonnegative(),
  feeBps: z.number().int().nonnegative().optional(),
  estimatedAprPct: z.number().nonnegative(),
  utilizationPct: z.number().nonnegative().optional(),
  riskScore: z.number().optional(),
  confidence: z.number().optional(),
  signals: z.array(z.string()).optional(),
  humanSummary: z.string().optional(),
  topPick: z.boolean().optional(),
  proof: z
    .object({
      toolProofHash: z.string(),
      recordedOnMantle: z.boolean(),
    })
    .optional(),
});

/**
 * A Byreal token surfaced by the same-origin `/api/byreal/tokens` route, ranked
 * by the ByrealPoolAnalyst's discovery skill. The set's top pick carries the
 * verifiable discovery proof.
 */
export const ByrealTokenSchema = z.object({
  mint: z.string(),
  symbol: z.string(),
  name: z.string(),
  priceUsd: z.number().nullable(),
  volume24hUsd: z.number().nonnegative(),
  marketCapUsd: z.number().nullable(),
  priceChange24hPct: z.number(),
  liquidityScore: z.number(),
  riskScore: z.number(),
  reason: z.string(),
  topPick: z.boolean().optional(),
  proof: z
    .object({
      toolProofHash: z.string(),
      recordedOnMantle: z.boolean(),
    })
    .optional(),
});

/** A non-executable Byreal swap quote preview from `/api/byreal/swap-preview`. */
export const ByrealSwapPreviewSchema = z.object({
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountIn: z.string(),
  expectedAmountOut: z.string(),
  minAmountOut: z.string(),
  executionPrice: z.number(),
  priceImpactPct: z.number(),
  route: z.array(z.string()),
  slippageBps: z.number(),
  riskScore: z.number(),
  humanSummary: z.string(),
  proof: z.object({
    toolProofHash: z.string(),
    recordedOnMantle: z.boolean(),
  }),
});

/**
 * Notification channel status surfaced by the backend `GET /notifications/status`.
 *
 * Each channel is `true` when its credentials are configured on the server
 * (Telegram bot token + chat id; Discord webhook url) and the channel will
 * actually deliver alerts. Permissive about extra fields the backend may add.
 */
export const NotificationStatusSchema = z.object({
  telegram: z.boolean(),
  discord: z.boolean(),
});

/** Builds the standard `{ success, data, error, meta }` envelope schema for a payload. */
export function envelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z
      .object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      })
      .optional(),
  });
}
