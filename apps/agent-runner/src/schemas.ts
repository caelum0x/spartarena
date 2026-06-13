import { z } from "zod";

/** Score bounded 0-100, matching the on-chain confidence/risk range. */
const score = z.number().int().min(0).max(100);

export const AlphaEvidenceSchema = z.object({
  type: z.enum(["transaction", "wallet", "token", "contract"]),
  value: z.string(),
  reason: z.string(),
  explorerUrl: z.string().url().optional(),
});

export const AlphaSentinelOutputSchema = z.object({
  agentName: z.literal("AlphaSentinel"),
  taskId: z.number().int().nonnegative(),
  decisionType: z.literal("ALPHA_ALERT"),
  summary: z.string().min(1),
  evidence: z.array(AlphaEvidenceSchema),
  confidence: score,
  riskScore: score,
  recommendedAction: z.enum(["ignore", "watchlist", "alert", "escalate"]),
  humanExplanation: z.string().min(1),
});

export const YieldAssetSchema = z.object({
  symbol: z.string(),
  suggestedWeight: z.number().min(0).max(100),
  reason: z.string(),
});

export const YieldStrategistOutputSchema = z.object({
  agentName: z.literal("YieldStrategist"),
  taskId: z.number().int().nonnegative(),
  decisionType: z.literal("RWA_STRATEGY"),
  strategySummary: z.string().min(1),
  assets: z.array(YieldAssetSchema),
  confidence: score,
  riskScore: score,
  policyWarnings: z.array(z.string()),
  humanExplanation: z.string().min(1),
});

/**
 * A single pool analyzed by the ByrealPoolAnalyst. The numeric fields are filled
 * deterministically by the agent from the Byreal adapter's real analysis; the
 * `reason` is authored by the LLM (with a deterministic fallback) so the
 * narrative is auditable and separable from the data.
 */
export const ByrealPoolSchema = z.object({
  poolAddress: z.string().min(1),
  pair: z.string().min(1),
  /** Total value locked, in USD. */
  tvl: z.number().nonnegative(),
  /** Estimated annualized fee APR, as a percentage. */
  apr: z.number().nonnegative(),
  /** Trailing 24h trading volume, in USD. */
  volume24h: z.number().nonnegative(),
  reason: z.string().min(1),
});

export const ByrealPoolAnalysisOutputSchema = z.object({
  agentName: z.literal("ByrealPoolAnalyst"),
  taskId: z.number().int().nonnegative(),
  decisionType: z.literal("BYREAL_POOL_ANALYSIS"),
  summary: z.string().min(1),
  pools: z.array(ByrealPoolSchema),
  topPick: z.object({
    poolAddress: z.string().min(1),
    reason: z.string().min(1),
  }),
  confidence: score,
  riskScore: score,
  humanExplanation: z.string().min(1),
});

/** A 0x-prefixed, 40-hex-character EVM address. */
const evmAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x-prefixed 40-hex-character address");

/** Ordered severity scale shared by the schema and deterministic risk math. */
export const AUDIT_SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;

export const ContractAuditFindingSchema = z.object({
  severity: z.enum(AUDIT_SEVERITIES),
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const ContractAuditOutputSchema = z.object({
  agentName: z.literal("ContractAuditor"),
  taskId: z.number().int().nonnegative(),
  decisionType: z.literal("CONTRACT_AUDIT"),
  /** The audited contract address. */
  target: evmAddress,
  summary: z.string().min(1),
  findings: z.array(ContractAuditFindingSchema),
  confidence: score,
  riskScore: score,
  humanExplanation: z.string().min(1),
});

export type AlphaSentinelOutput = z.infer<typeof AlphaSentinelOutputSchema>;
export type YieldStrategistOutput = z.infer<typeof YieldStrategistOutputSchema>;
export type ByrealPool = z.infer<typeof ByrealPoolSchema>;
export type ByrealPoolAnalysisOutput = z.infer<typeof ByrealPoolAnalysisOutputSchema>;
export type ContractAuditFinding = z.infer<typeof ContractAuditFindingSchema>;
export type ContractAuditOutput = z.infer<typeof ContractAuditOutputSchema>;
export type AgentOutput =
  | AlphaSentinelOutput
  | YieldStrategistOutput
  | ByrealPoolAnalysisOutput
  | ContractAuditOutput;

/**
 * The narrow JSON the LLM is asked to produce for AlphaSentinel. Deterministic
 * fields (confidence, riskScore, evidence linkage) are added by the agent; the
 * LLM owns the qualitative judgement (summary, per-evidence reasoning, action,
 * and a human explanation). Kept separate so the LLM contract is auditable and
 * the agent can cross-check the model's `recommendedAction` against its own.
 */
export const AlphaLlmDecisionSchema = z.object({
  summary: z.string().min(1),
  recommendedAction: z.enum(["ignore", "watchlist", "alert", "escalate"]),
  evidenceReasoning: z.array(
    z.object({
      value: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  humanExplanation: z.string().min(1),
});
export type AlphaLlmDecision = z.infer<typeof AlphaLlmDecisionSchema>;

/**
 * The narrow JSON the LLM is asked to produce for YieldStrategist. Suggested
 * weights are derived deterministically by the agent; the LLM owns the strategy
 * narrative, per-asset rationale, policy warnings, and human explanation.
 */
export const YieldLlmDecisionSchema = z.object({
  strategySummary: z.string().min(1),
  assetReasoning: z.array(
    z.object({
      symbol: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  policyWarnings: z.array(z.string()),
  humanExplanation: z.string().min(1),
});
export type YieldLlmDecision = z.infer<typeof YieldLlmDecisionSchema>;

/**
 * The narrow JSON the LLM is asked to produce for ByrealPoolAnalyst. The pool
 * numbers (tvl/apr/volume) and risk/confidence are derived deterministically by
 * the agent from the Byreal adapter; the LLM owns the qualitative narrative —
 * the overall summary, the rationale for the chosen top pick, the per-pool
 * reasoning, and the human explanation. Kept separate so the LLM contract is
 * auditable and the agent can cross-check the model's pick against its own.
 */
export const ByrealLlmDecisionSchema = z.object({
  summary: z.string().min(1),
  topPick: z.object({
    poolAddress: z.string().min(1),
    reason: z.string().min(1),
  }),
  poolReasoning: z.array(
    z.object({
      poolAddress: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  humanExplanation: z.string().min(1),
});
export type ByrealLlmDecision = z.infer<typeof ByrealLlmDecisionSchema>;

/**
 * The narrow JSON the LLM is asked to produce for ContractAuditor. The on-chain
 * facts (is it a deployed contract, bytecode size, balance, and the deterministic
 * bytecode heuristics) are gathered by the agent via ContractInspector; the LLM
 * owns only the qualitative narrative — an overall summary, the per-finding title
 * and reasoning detail, and a plain-language human explanation. The agent attaches
 * the deterministic severity to each finding (the LLM may not invent severities),
 * so the LLM contract stays auditable and the risk score stays reproducible.
 */
export const ContractAuditLlmDecisionSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(
    z.object({
      /** Stable key linking this narrative back to a deterministic heuristic. */
      code: z.string().min(1),
      title: z.string().min(1),
      detail: z.string().min(1),
    }),
  ),
  humanExplanation: z.string().min(1),
});
export type ContractAuditLlmDecision = z.infer<typeof ContractAuditLlmDecisionSchema>;
