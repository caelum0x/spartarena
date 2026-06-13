import { type LlmProvider, completeJsonOrFallback } from "../llm/provider.js";
import { AssetDataTool, type AssetSnapshot, type AssetSymbol } from "../tools/assets.js";
import {
  YieldStrategistOutputSchema,
  YieldLlmDecisionSchema,
  type YieldStrategistOutput,
  type YieldLlmDecision,
} from "../schemas.js";
import { YIELD_STRATEGIST_SYSTEM_PROMPT } from "../prompts/yield-strategist.system.js";
import type { AgentRun, BaseAgent } from "./BaseAgent.js";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface YieldStrategistInput {
  taskId: number;
  assets: readonly AssetSymbol[];
  goal: string;
  riskProfile?: RiskProfile;
}

const SYSTEM_PROMPT = YIELD_STRATEGIST_SYSTEM_PROMPT;

/** Default universe when the caller does not specify one. */
const DEFAULT_ASSETS: readonly AssetSymbol[] = ["MNT", "mETH", "USDY"];

/**
 * Conservative single-asset concentration ceiling. The strategy never *recommends*
 * a larger share than this in one asset, even if inverse-volatility weighting
 * would; excess is redistributed across the remaining assets.
 */
const CONCENTRATION_CEILING = 70;

/**
 * Inverse-volatility weights: lower-volatility assets receive a larger share,
 * implementing a conservative, capital-preservation-first allocation. Weights
 * are deterministic given the asset snapshots so scoring is reproducible. The
 * per-asset share is capped at CONCENTRATION_CEILING and the remainder is spread
 * proportionally across the other assets so the result still sums to ~100%.
 */
function deriveWeights(snapshots: readonly AssetSnapshot[]): number[] {
  if (snapshots.length === 1) {
    return [100];
  }

  const inverse = snapshots.map((s) => 1 / Math.max(s.volatilityPct, 0.5));
  const total = inverse.reduce((sum, v) => sum + v, 0);
  const raw =
    total <= 0
      ? snapshots.map(() => 100 / snapshots.length)
      : inverse.map((v) => (v / total) * 100);

  const capped = applyConcentrationCap(raw);
  return capped.map(round2);
}

/**
 * Caps any single weight at CONCENTRATION_CEILING, redistributing the overflow
 * proportionally across the uncapped assets. Iterates until stable so a cascade
 * of caps still respects the ceiling.
 */
function applyConcentrationCap(weights: readonly number[]): number[] {
  const result = [...weights];
  for (let iteration = 0; iteration < result.length; iteration += 1) {
    const overIndex = result.findIndex((w) => w > CONCENTRATION_CEILING + 1e-9);
    if (overIndex === -1) {
      return result;
    }
    const overflow = result[overIndex]! - CONCENTRATION_CEILING;
    result[overIndex] = CONCENTRATION_CEILING;

    const uncappedTotal = result.reduce(
      (sum, w, i) => (i === overIndex || w >= CONCENTRATION_CEILING ? sum : sum + w),
      0,
    );
    if (uncappedTotal <= 0) {
      return result;
    }
    for (let i = 0; i < result.length; i += 1) {
      if (i !== overIndex && result[i]! < CONCENTRATION_CEILING) {
        result[i] = result[i]! + (overflow * result[i]!) / uncappedTotal;
      }
    }
  }
  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds policy warnings from the snapshots. Surfacing these is part of the
 * agent's "safety" mandate and is auditable independently of the LLM prose.
 */
function buildPolicyWarnings(
  snapshots: readonly AssetSnapshot[],
  weights: readonly number[],
): string[] {
  const warnings: string[] = [];

  snapshots.forEach((s, i) => {
    const weight = weights[i] ?? 0;
    if (s.volatilityPct >= 40 && weight > 10) {
      warnings.push(
        `${s.symbol} is high-volatility (${s.volatilityPct}%); allocation capped — review before sizing up.`,
      );
    }
    if (s.liquidity === "thin") {
      warnings.push(`${s.symbol} has thin liquidity; exits may incur slippage.`);
    }
    if (s.pegged) {
      warnings.push(`${s.symbol} is pegged; monitor for de-peg events despite low volatility.`);
    }
  });

  const topWeight = Math.max(0, ...weights);
  if (topWeight > 70) {
    warnings.push(
      `Single-asset concentration of ${topWeight}% exceeds the 70% conservative ceiling.`,
    );
  }

  return warnings;
}

/**
 * YieldStrategist: fetches conservative asset data, derives an inverse-volatility
 * allocation, asks the LLM to narrate the rationale, and produces a validated
 * RWA_STRATEGY decision. Risk/confidence are derived deterministically from the
 * data so scoring is reproducible. Never executes real capital (MVP).
 */
export class YieldStrategistAgent
  implements BaseAgent<YieldStrategistInput, YieldStrategistOutput>
{
  constructor(
    private readonly llm: LlmProvider,
    private readonly assets: AssetDataTool,
  ) {}

  async run(input: YieldStrategistInput): Promise<AgentRun<YieldStrategistOutput>> {
    const universe = input.assets.length > 0 ? input.assets : DEFAULT_ASSETS;
    const snapshots = await this.assets.getAssetSnapshots(universe);

    const weights = deriveWeights(snapshots);
    const deterministicWarnings = buildPolicyWarnings(snapshots, weights);

    // Portfolio volatility = weighted average of asset volatilities.
    const portfolioVol = snapshots.reduce(
      (acc, s, i) => acc + s.volatilityPct * ((weights[i] ?? 0) / 100),
      0,
    );
    // Conservative risk: scaled portfolio volatility, plus a warning penalty.
    const riskScore = clampScore(Math.round(portfolioVol * 1.4) + deterministicWarnings.length * 3);
    // Confidence: high when the data is complete and warnings are few.
    const confidence = clampScore(82 - deterministicWarnings.length * 6 + snapshots.length * 2);

    const userPrompt = [
      input.goal,
      `Risk profile: ${input.riskProfile ?? "conservative"}`,
      `Universe: ${universe.join(", ")}`,
      `Derived weights: ${snapshots.map((s, i) => `${s.symbol} ${weights[i]}%`).join(", ")}`,
      `Deterministic risk=${riskScore}, confidence=${confidence}.`,
      `Detected policy concerns: ${deterministicWarnings.length > 0 ? deterministicWarnings.join("; ") : "none"}.`,
      `Live asset data (CoinGecko + DefiLlama): ${JSON.stringify(snapshots)}`,
      "Narrate the strategy, give a reason for each asset's weight, and list any policy warnings.",
    ].join("\n");

    const decision = await completeJsonOrFallback(
      this.llm,
      SYSTEM_PROMPT,
      userPrompt,
      YieldLlmDecisionSchema,
      buildFallbackDecision(universe, snapshots, deterministicWarnings),
    );

    // Union of deterministic + LLM-surfaced warnings (deterministic always kept).
    const policyWarnings = mergeWarnings(deterministicWarnings, decision.policyWarnings);

    const output: YieldStrategistOutput = {
      agentName: "YieldStrategist",
      taskId: input.taskId,
      decisionType: "RWA_STRATEGY",
      strategySummary: decision.strategySummary,
      assets: snapshots.map((s, i) => ({
        symbol: s.symbol,
        suggestedWeight: weights[i] ?? 0,
        reason: reasonFor(s.symbol, decision, s.note),
      })),
      confidence,
      riskScore,
      policyWarnings,
      humanExplanation: decision.humanExplanation,
    };

    // Validate at the boundary — never emit an unverified shape.
    const parsed = YieldStrategistOutputSchema.parse(output);

    return {
      prompt: { system: SYSTEM_PROMPT, user: userPrompt },
      toolCalls: this.assets.calls,
      output: parsed,
    };
  }
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Deterministic fallback used only on the offline mock path. */
function buildFallbackDecision(
  universe: readonly AssetSymbol[],
  snapshots: readonly AssetSnapshot[],
  warnings: readonly string[],
): YieldLlmDecision {
  return {
    strategySummary: `Conservative ${universe.join("/")} allocation favouring lower-volatility, yield-bearing assets for capital preservation.`,
    assetReasoning: snapshots.map((s) => ({ symbol: s.symbol, reason: s.note })),
    policyWarnings: [...warnings],
    humanExplanation: `Allocation prioritises capital preservation across ${universe.join(", ")}, weighting by inverse volatility and capping single-asset concentration. ${warnings.length} policy concern(s) flagged.`,
  };
}

function reasonFor(symbol: string, decision: YieldLlmDecision, fallback: string): string {
  const match = decision.assetReasoning.find((a) => a.symbol === symbol);
  return match?.reason ?? fallback;
}

/** Keep all deterministic warnings; append any LLM warnings not already present. */
function mergeWarnings(
  deterministic: readonly string[],
  llm: readonly string[],
): string[] {
  const seen = new Set(deterministic.map((w) => w.toLowerCase()));
  const extra = llm.filter((w) => !seen.has(w.toLowerCase()));
  return [...deterministic, ...extra];
}
