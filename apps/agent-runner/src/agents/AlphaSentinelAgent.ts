import { type LlmProvider, completeJsonOrFallback } from "../llm/provider.js";
import { MantleReader, buildExplorerLink, type WalletActivity } from "../tools/mantle.js";
import {
  AlphaSentinelOutputSchema,
  AlphaLlmDecisionSchema,
  type AlphaSentinelOutput,
  type AlphaLlmDecision,
} from "../schemas.js";
import { ALPHA_SENTINEL_SYSTEM_PROMPT } from "../prompts/alpha-sentinel.system.js";
import type { AgentRun, BaseAgent } from "./BaseAgent.js";

// Re-export so existing importers of `AgentRun` from this module keep resolving.
export type { AgentRun } from "./BaseAgent.js";

export interface AlphaSentinelInput {
  taskId: number;
  targetWallet: `0x${string}`;
  query: string;
  riskMode?: "conservative" | "balanced" | "aggressive";
}

const SYSTEM_PROMPT = ALPHA_SENTINEL_SYSTEM_PROMPT;

type RecommendedAction = AlphaSentinelOutput["recommendedAction"];

/**
 * AlphaSentinel: reads REAL wallet activity on Mantle, asks the LLM to reason
 * over the evidence and produce the structured qualitative decision (summary,
 * per-evidence reasoning, recommended action, human explanation) via
 * `completeJson` + zod. Confidence/riskScore are derived deterministically from
 * the real anomaly signals and cross-checked against the LLM's action.
 */
export class AlphaSentinelAgent
  implements BaseAgent<AlphaSentinelInput, AlphaSentinelOutput>
{
  constructor(
    private readonly llm: LlmProvider,
    private readonly reader: MantleReader,
  ) {}

  async run(input: AlphaSentinelInput): Promise<AgentRun<AlphaSentinelOutput>> {
    const activity = await this.reader.getWalletActivity(input.targetWallet);

    const { riskScore, confidence, deterministicAction } = deriveScores(activity);

    const userPrompt = [
      input.query,
      `Target wallet: ${input.targetWallet}`,
      `Risk mode: ${input.riskMode ?? "conservative"}`,
      `Native balance: ${activity.balanceMnt} MNT`,
      `Data source: ${activity.source}`,
      `Anomaly signals: ${JSON.stringify(activity.signals)}`,
      `Recent transfers: ${JSON.stringify(activity.recentTransfers)}`,
      `Deterministic risk=${riskScore}, confidence=${confidence}, suggested action=${deterministicAction}.`,
      "Decide the recommendedAction and explain each transfer's significance.",
    ].join("\n");

    const decision = await completeJsonOrFallback(
      this.llm,
      SYSTEM_PROMPT,
      userPrompt,
      AlphaLlmDecisionSchema,
      buildFallbackDecision(activity, deterministicAction),
    );

    const output: AlphaSentinelOutput = {
      agentName: "AlphaSentinel",
      taskId: input.taskId,
      decisionType: "ALPHA_ALERT",
      summary: decision.summary,
      evidence: activity.recentTransfers.map((t) => ({
        type: "transaction" as const,
        value: t.hash,
        reason: reasonFor(t.hash, decision, t.note),
        explorerUrl: buildExplorerLink("tx", t.hash),
      })),
      confidence,
      riskScore,
      // Cross-check: take the more severe of the LLM's and the deterministic action.
      recommendedAction: maxAction(decision.recommendedAction, deterministicAction),
      humanExplanation: decision.humanExplanation,
    };

    const parsed = AlphaSentinelOutputSchema.parse(output);

    return {
      prompt: { system: SYSTEM_PROMPT, user: userPrompt },
      toolCalls: this.reader.calls,
      output: parsed,
    };
  }
}

/** Deterministic risk/confidence/action from real anomaly signals. */
function deriveScores(activity: WalletActivity): {
  riskScore: number;
  confidence: number;
  deterministicAction: RecommendedAction;
} {
  const { maxOverMedian, outlierCount, transfersToNewContracts } = activity.signals;
  const transferCount = activity.recentTransfers.length;

  const riskScore = clamp(
    Math.round(
      Math.min(60, maxOverMedian * 6) +
        outlierCount * 12 +
        transfersToNewContracts * 15 +
        14,
    ),
  );
  // Confidence grows with the amount of real evidence available.
  const confidence = clamp(50 + Math.min(40, transferCount * 8));
  const deterministicAction: RecommendedAction =
    riskScore >= 75 ? "escalate" : riskScore >= 50 ? "alert" : riskScore >= 25 ? "watchlist" : "ignore";

  return { riskScore, confidence, deterministicAction };
}

/** Deterministic fallback used only on the offline mock path. */
function buildFallbackDecision(
  activity: WalletActivity,
  action: RecommendedAction,
): AlphaLlmDecision {
  return {
    summary: `Reviewed ${activity.recentTransfers.length} recent transfers; largest is ${activity.signals.maxOverMedian.toFixed(1)}× the wallet's median.`,
    recommendedAction: action,
    evidenceReasoning: activity.recentTransfers.map((t) => ({ value: t.hash, reason: t.note })),
    humanExplanation: `This wallet shows ${activity.signals.outlierCount} outlier transfer(s) versus its recent median of ${activity.signals.medianValue.toFixed(2)}. Recommended action: ${action}.`,
  };
}

function reasonFor(hash: string, decision: AlphaLlmDecision, fallback: string): string {
  const match = decision.evidenceReasoning.find((e) => e.value === hash);
  return match?.reason ?? fallback;
}

const ACTION_RANK: Record<RecommendedAction, number> = {
  ignore: 0,
  watchlist: 1,
  alert: 2,
  escalate: 3,
};

function maxAction(a: RecommendedAction, b: RecommendedAction): RecommendedAction {
  return ACTION_RANK[a] >= ACTION_RANK[b] ? a : b;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
