import type {
  AgentOutput,
  AlphaSentinelOutput,
  YieldStrategistOutput,
} from "@spartarena/shared";
import {
  AlphaSentinelOutputSchema,
  YieldStrategistOutputSchema,
} from "@spartarena/shared";
import { isAddress } from "viem";
import { childLogger } from "../../lib/logger.js";
import { ValidationError } from "../../lib/errors.js";
import type { AgentKind, ToolCall } from "./execution.types.js";
import { getProvider, hasLlmProvider } from "../../llm/provider.js";
import {
  ALPHA_SENTINEL_SYSTEM_PROMPT,
  YIELD_STRATEGIST_SYSTEM_PROMPT,
} from "./prompts.js";
import { MantleReader, type WalletActivity } from "./tools/mantle.tool.js";
import {
  AssetDataTool,
  type AssetSnapshot,
  type AssetSymbol,
} from "./tools/assets.tool.js";

/**
 * Real Spartan decision pipeline.
 *
 * Each run performs REAL reads (Mantle balance + token transfers for AlphaSentinel;
 * CoinGecko prices + DefiLlama Mantle yields for YieldStrategist), derives a
 * deterministic, auditable structured decision from that real data, and asks a
 * REAL LLM (Anthropic/OpenAI via env) to narrate the human explanation. Confidence
 * and risk are computed from the observed data — not fabricated — so on-chain hashes
 * are reproducible. When no LLM is configured the structured decision (from real
 * reads) still stands and the narration falls back to a deterministic summary.
 */
const log = childLogger("execution.agent");

const DEFAULT_ASSETS: readonly AssetSymbol[] = ["MNT", "mETH", "USDY"];
const CONCENTRATION_CEILING = 70;

/** Map an agent kind to its on-chain action type string. */
export function actionTypeFor(agentKind: AgentKind): string {
  return agentKind === "AlphaSentinel" ? "ALPHA_ALERT" : "RWA_STRATEGY";
}

/** Extract the first 0x address from free text (used as the AlphaSentinel target). */
function addressFromText(text: string): `0x${string}` | undefined {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  return match && isAddress(match[0]) ? (match[0] as `0x${string}`) : undefined;
}

async function narrate(
  system: string,
  user: string,
  fallback: string,
): Promise<string> {
  if (!hasLlmProvider()) return fallback;
  try {
    const text = await getProvider().complete(system, user);
    return text.trim().length > 0 ? text.trim() : fallback;
  } catch (err) {
    log.warn({ err }, "LLM narration failed; using deterministic fallback");
    return fallback;
  }
}

// ── AlphaSentinel ───────────────────────────────────────────────────────────

async function runAlpha(
  taskId: number,
  description: string,
  targetWallet: `0x${string}`,
): Promise<{ output: AlphaSentinelOutput; toolCalls: ToolCall[] }> {
  const reader = new MantleReader();
  const activity: WalletActivity = await reader.getWalletActivity(targetWallet);

  // Risk scales with how far the largest move sits above the baseline, plus the
  // count of flagged outliers. Confidence scales with how much real evidence we have.
  const ratio =
    activity.baselineValue > 0 ? activity.maxValue / activity.baselineValue : 0;
  const riskScore = clamp(
    Math.round(Math.min(70, ratio * 8) + activity.outlierCount * 10),
  );
  const confidence = clamp(40 + Math.min(50, activity.transferCount * 4));

  const recommendedAction: AlphaSentinelOutput["recommendedAction"] =
    riskScore >= 75
      ? "escalate"
      : riskScore >= 55
        ? "alert"
        : riskScore >= 35
          ? "watchlist"
          : "ignore";

  const evidence = activity.transfers
    .filter((t) => t.isOutlier)
    .slice(0, 5)
    .map((t) => ({
      type: "transaction" as const,
      value: t.hash,
      reason: `${t.tokenSymbol} transfer of ${t.value} (baseline ${activity.baselineValue.toFixed(2)})`,
      ...(t.explorerUrl ? { explorerUrl: t.explorerUrl } : {}),
    }));

  const summary =
    activity.outlierCount > 0
      ? `Detected ${activity.outlierCount} outsized transfer(s) for ${targetWallet} relative to its recent baseline.`
      : `No anomalous transfers detected for ${targetWallet} across ${activity.transferCount} recent transfers.`;

  const fallback =
    `${summary} Native balance ${activity.nativeBalanceMnt} MNT. ` +
    `Confidence ${confidence}/100, risk ${riskScore}/100. Recommended action: ${recommendedAction}.`;

  const userPrompt = [
    description,
    `Target wallet: ${targetWallet}`,
    `Native balance: ${activity.nativeBalanceMnt} MNT`,
    `Recent transfers: ${activity.transferCount}, baseline value ${activity.baselineValue}, max ${activity.maxValue}, outliers ${activity.outlierCount}`,
    `Evidence: ${JSON.stringify(evidence)}`,
    "Explain the risk to a non-technical user in 2-4 sentences. Reference only the supplied evidence.",
  ].join("\n");

  const humanExplanation = await narrate(ALPHA_SENTINEL_SYSTEM_PROMPT, userPrompt, fallback);

  const output = AlphaSentinelOutputSchema.parse({
    agentName: "AlphaSentinel",
    taskId,
    decisionType: "ALPHA_ALERT",
    summary,
    evidence,
    confidence,
    riskScore,
    recommendedAction,
    humanExplanation,
  } satisfies AlphaSentinelOutput);

  return { output, toolCalls: reader.calls };
}

// ── YieldStrategist ───────────────────────────────────────────────────────────

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Inverse-volatility weights, capped at the concentration ceiling. */
function deriveWeights(snapshots: readonly AssetSnapshot[]): number[] {
  if (snapshots.length === 1) return [100];
  const inverse = snapshots.map((s) => 1 / Math.max(s.volatilityPct, 0.5));
  const total = inverse.reduce((sum, v) => sum + v, 0);
  const raw =
    total <= 0
      ? snapshots.map(() => 100 / snapshots.length)
      : inverse.map((v) => (v / total) * 100);
  return capWeights(raw).map(round2);
}

function capWeights(weights: readonly number[]): number[] {
  const result = [...weights];
  for (let iteration = 0; iteration < result.length; iteration += 1) {
    const overIndex = result.findIndex((w) => w > CONCENTRATION_CEILING + 1e-9);
    if (overIndex === -1) return result;
    const overflow = result[overIndex]! - CONCENTRATION_CEILING;
    result[overIndex] = CONCENTRATION_CEILING;
    const uncappedTotal = result.reduce(
      (sum, w, i) => (i === overIndex || w >= CONCENTRATION_CEILING ? sum : sum + w),
      0,
    );
    if (uncappedTotal <= 0) return result;
    for (let i = 0; i < result.length; i += 1) {
      if (i !== overIndex && result[i]! < CONCENTRATION_CEILING) {
        result[i] = result[i]! + (overflow * result[i]!) / uncappedTotal;
      }
    }
  }
  return result;
}

function buildPolicyWarnings(
  snapshots: readonly AssetSnapshot[],
  weights: readonly number[],
): string[] {
  const warnings: string[] = [];
  snapshots.forEach((s, i) => {
    const weight = weights[i] ?? 0;
    if (s.volatilityPct >= 20 && weight > 10) {
      warnings.push(
        `${s.symbol} shows ${s.volatilityPct.toFixed(1)}% 24h volatility; allocation capped — review before sizing up.`,
      );
    }
    if (s.pegged && Math.abs(s.change24hPct) > 1) {
      warnings.push(`${s.symbol} is pegged but moved ${s.change24hPct.toFixed(2)}% in 24h; watch for de-peg.`);
    }
  });
  const topWeight = Math.max(0, ...weights);
  if (topWeight > CONCENTRATION_CEILING) {
    warnings.push(
      `Single-asset concentration of ${topWeight}% exceeds the ${CONCENTRATION_CEILING}% conservative ceiling.`,
    );
  }
  return warnings;
}

async function runYield(
  taskId: number,
  description: string,
  universe: readonly AssetSymbol[],
): Promise<{ output: YieldStrategistOutput; toolCalls: ToolCall[] }> {
  const assets = new AssetDataTool();
  const snapshots = await assets.getAssetSnapshots(universe);

  const weights = deriveWeights(snapshots);
  const policyWarnings = buildPolicyWarnings(snapshots, weights);
  const portfolioVol = snapshots.reduce(
    (acc, s, i) => acc + s.volatilityPct * ((weights[i] ?? 0) / 100),
    0,
  );
  const riskScore = clamp(Math.round(portfolioVol * 1.4) + policyWarnings.length * 3);
  const confidence = clamp(82 - policyWarnings.length * 6 + snapshots.length * 2);

  const strategySummary = `Conservative ${universe.join("/")} allocation favouring lower-volatility, yield-bearing assets for capital preservation.`;

  const fallback =
    `${strategySummary} Weights: ${snapshots
      .map((s, i) => `${s.symbol} ${weights[i]}%`)
      .join(", ")}. Confidence ${confidence}/100, risk ${riskScore}/100. No live capital is moved.`;

  const userPrompt = [
    description,
    `Universe: ${universe.join(", ")}`,
    `Derived weights: ${snapshots.map((s, i) => `${s.symbol} ${weights[i]}%`).join(", ")}`,
    `Asset data: ${JSON.stringify(snapshots)}`,
    "Justify the allocation conservatively in 2-4 sentences using only the supplied data.",
  ].join("\n");

  const humanExplanation = await narrate(YIELD_STRATEGIST_SYSTEM_PROMPT, userPrompt, fallback);

  const output = YieldStrategistOutputSchema.parse({
    agentName: "YieldStrategist",
    taskId,
    decisionType: "RWA_STRATEGY",
    strategySummary,
    assets: snapshots.map((s, i) => ({
      symbol: s.symbol,
      suggestedWeight: weights[i] ?? 0,
      reason: s.note,
    })),
    confidence,
    riskScore,
    policyWarnings,
    humanExplanation,
  } satisfies YieldStrategistOutput);

  return { output, toolCalls: assets.calls };
}

/**
 * Run the real pipeline for an agent kind and produce a validated structured
 * decision plus its real tool-call trace.
 *
 * `targetWallet` (AlphaSentinel) is resolved by the caller — typically the
 * Battle's assigned Spartan wallet or an address embedded in the description.
 */
export async function generateDecision(
  agentKind: AgentKind,
  taskId: number,
  description: string,
  options: { targetWallet?: string } = {},
): Promise<{ output: AgentOutput; toolCalls: ToolCall[] }> {
  if (agentKind === "AlphaSentinel") {
    const target =
      addressFromText(description) ??
      (options.targetWallet && isAddress(options.targetWallet)
        ? (options.targetWallet as `0x${string}`)
        : undefined);
    if (!target) {
      throw new ValidationError(
        "AlphaSentinel requires a target wallet (0x address) in the Battle description or assigned Spartan.",
      );
    }
    return runAlpha(taskId, description, target);
  }
  return runYield(taskId, description, DEFAULT_ASSETS);
}
