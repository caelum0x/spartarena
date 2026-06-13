import { z } from "zod";
import { Bytes32Schema } from "./agent.js";

/**
 * Decision (War Chronicle) schemas.
 *
 * The structured agent outputs (AlphaSentinelOutput, YieldStrategistOutput)
 * mirror apps/agent-runner/src/schemas.ts exactly so the runner, api and web all
 * agree on shape and hashing. {@link DecisionRecordSchema} mirrors the on-chain
 * DecisionLedger entry that commits hashes of those outputs.
 */

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

/** Discriminated union over all structured agent outputs. */
export const AgentOutputSchema = z.discriminatedUnion("agentName", [
  AlphaSentinelOutputSchema,
  YieldStrategistOutputSchema,
]);

/** Action category recorded on-chain alongside a decision. */
export const ActionTypeSchema = z.enum([
  "ALPHA_ALERT",
  "RWA_STRATEGY",
  "GAS_OPTIMIZATION",
  "CONTRACT_AUDIT",
  "OTHER",
]);

/**
 * On-chain decision record (decoded from DecisionLedger.getDecision). Commits
 * the hashes of the prompt, output and tool calls plus scored metadata.
 */
export const DecisionRecordSchema = z.object({
  decisionId: z.number().int().nonnegative(),
  agentId: z.number().int().nonnegative(),
  taskId: z.number().int().nonnegative(),
  promptHash: Bytes32Schema,
  outputHash: Bytes32Schema,
  toolsHash: Bytes32Schema,
  confidence: score,
  riskScore: score,
  actionType: ActionTypeSchema,
});

export type AlphaEvidence = z.infer<typeof AlphaEvidenceSchema>;
export type AlphaSentinelOutput = z.infer<typeof AlphaSentinelOutputSchema>;
export type YieldAsset = z.infer<typeof YieldAssetSchema>;
export type YieldStrategistOutput = z.infer<typeof YieldStrategistOutputSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Decision = z.infer<typeof DecisionRecordSchema>;
