import {
  createByrealAdapter,
  type ByrealSkillAdapter,
  type CreateByrealAdapterOptions,
  type PoolAnalysisResult,
} from "@spartarena/byreal-adapter";
import { type LlmProvider, completeJsonOrFallback } from "../llm/provider.js";
import {
  ByrealPoolAnalysisOutputSchema,
  ByrealLlmDecisionSchema,
  type ByrealPool,
  type ByrealPoolAnalysisOutput,
  type ByrealLlmDecision,
} from "../schemas.js";
import { BYREAL_POOL_ANALYST_SYSTEM_PROMPT } from "../prompts/byreal-pool-analyst.system.js";
import type { ToolCall } from "../tools/mantle.js";
import type { AgentRun, BaseAgent } from "./BaseAgent.js";

const SYSTEM_PROMPT = BYREAL_POOL_ANALYST_SYSTEM_PROMPT;

/** A single pool the caller wants analyzed (Solana base58 or EVM 0x address). */
export interface ByrealPoolRef {
  poolAddress: string;
  /** Optional human label for the pair, e.g. "SOL/USDC". */
  pairLabel?: string;
}

export interface ByrealPoolAnalysisInput {
  taskId: number;
  /** Candidate pools to compare. */
  pools: readonly ByrealPoolRef[];
  /** What the LP is optimising for; threaded into the LLM prompt. */
  goal?: string;
  /** Optional adapter overrides (e.g. injecting a client or mock mode). */
  adapterOptions?: CreateByrealAdapterOptions;
}

/**
 * One analyzed pool plus the proof hash carried from the Byreal adapter so the
 * tool usage can be hashed into the decision proof and surfaced in the UI.
 */
interface AnalyzedPool {
  result: PoolAnalysisResult;
  pool: ByrealPool;
}

/**
 * ByrealPoolAnalyst: compares Byreal (Solana DEX) liquidity pools using the REAL
 * Byreal adapter. For each candidate pool it calls `analyzePool` (real REST read
 * by default; deterministic mock behind BYREAL_MOCK=true), records the call as a
 * ToolCall carrying the adapter's `toolProofHash`, and fills the deterministic
 * pool numbers (TVL / APR / 24h volume). Risk and confidence are derived
 * deterministically from those figures so scoring is reproducible. The LLM is
 * asked only for the qualitative narrative (summary, top-pick rationale, per-pool
 * reasoning, human explanation) via `completeJsonOrFallback`. Never executes LP
 * capital — analysis only.
 */
export class ByrealPoolAnalysisAgent
  implements BaseAgent<ByrealPoolAnalysisInput, ByrealPoolAnalysisOutput>
{
  private readonly adapter: ByrealSkillAdapter;
  readonly calls: ToolCall[] = [];

  constructor(
    private readonly llm: LlmProvider,
    adapter?: ByrealSkillAdapter,
    adapterOptions?: CreateByrealAdapterOptions,
  ) {
    this.adapter = adapter ?? createByrealAdapter(adapterOptions);
  }

  async run(input: ByrealPoolAnalysisInput): Promise<AgentRun<ByrealPoolAnalysisOutput>> {
    // Reset per-run tool calls so a reused instance never folds a prior run's
    // calls into this run's toolsHash (which would corrupt the proof).
    this.calls.length = 0;
    if (input.pools.length === 0) {
      throw new Error("ByrealPoolAnalysisAgent requires at least one pool to analyze.");
    }

    const analyzed = await this.analyzeAll(input.pools);
    const pools = analyzed.map((a) => a.pool);

    const ranked = rankPools(analyzed);
    const top = ranked[0]!;

    const riskScore = clampScore(deriveRisk(analyzed));
    const confidence = clampScore(deriveConfidence(analyzed));

    const userPrompt = [
      input.goal ?? "Recommend the strongest Byreal pool for a liquidity provider.",
      `Candidate pools (${pools.length}):`,
      ...pools.map(
        (p) =>
          `- ${p.pair} (${p.poolAddress}): TVL $${p.tvl.toLocaleString()}, ` +
          `APR ~${p.apr}%, 24h vol $${p.volume24h.toLocaleString()}`,
      ),
      `Deterministic top pick: ${top.pool.poolAddress} (${top.pool.pair}).`,
      `Deterministic risk=${riskScore}, confidence=${confidence}.`,
      "Narrate the comparison, justify the top pick, and give a reason for each pool.",
    ].join("\n");

    const decision = await completeJsonOrFallback(
      this.llm,
      SYSTEM_PROMPT,
      userPrompt,
      ByrealLlmDecisionSchema,
      buildFallbackDecision(pools, top.pool),
    );

    // The agent owns the pool set, so the top pick must be one of the analyzed
    // pools. Trust the LLM's pick only when it names a real candidate; otherwise
    // fall back to the deterministic ranking.
    const topPickAddress = pools.some((p) => p.poolAddress === decision.topPick.poolAddress)
      ? decision.topPick.poolAddress
      : top.pool.poolAddress;

    const output: ByrealPoolAnalysisOutput = {
      agentName: "ByrealPoolAnalyst",
      taskId: input.taskId,
      decisionType: "BYREAL_POOL_ANALYSIS",
      summary: decision.summary,
      pools: pools.map((p) => ({
        ...p,
        reason: reasonFor(p.poolAddress, decision, p.reason),
      })),
      topPick: {
        poolAddress: topPickAddress,
        reason: decision.topPick.reason,
      },
      confidence,
      riskScore,
      humanExplanation: decision.humanExplanation,
    };

    // Validate at the boundary — never emit an unverified shape.
    const parsed = ByrealPoolAnalysisOutputSchema.parse(output);

    return {
      prompt: { system: SYSTEM_PROMPT, user: userPrompt },
      toolCalls: this.calls,
      output: parsed,
    };
  }

  /** Analyze each candidate pool, recording a proof-carrying ToolCall per pool. */
  private async analyzeAll(refs: readonly ByrealPoolRef[]): Promise<AnalyzedPool[]> {
    const analyzed: AnalyzedPool[] = [];
    for (const ref of refs) {
      const result = await this.adapter.analyzePool({
        // Byreal is a Solana DEX, so pool/token addresses are base58 (chain "solana").
        chain: "solana",
        poolAddress: ref.poolAddress,
        ...(ref.pairLabel ? { pairLabel: ref.pairLabel } : {}),
      });

      // Record the adapter call, carrying its tamper-evident toolProofHash so the
      // decision proof's toolsHash binds the real Byreal read.
      this.calls.push({
        tool: "byreal.analyzePool",
        input: { poolAddress: ref.poolAddress, pairLabel: ref.pairLabel },
        output: {
          poolAddress: result.poolAddress,
          pairLabel: result.pairLabel,
          tvlUsd: result.tvlUsd,
          estimatedAprPct: result.estimatedAprPct,
          volume24hUsd: result.volume24hUsd,
          riskScore: result.riskScore,
          confidence: result.confidence,
          toolProofHash: result.proof.toolProofHash,
          recordedOnMantle: result.proof.recordedOnMantle,
          source: result.proof.source,
        },
      });

      analyzed.push({
        result,
        pool: {
          poolAddress: result.poolAddress,
          pair: result.pairLabel,
          tvl: result.tvlUsd,
          apr: result.estimatedAprPct,
          volume24h: result.volume24hUsd,
          // Default reason from the adapter's first signal; the LLM may override.
          reason: result.signals[0] ?? result.humanSummary,
        },
      });
    }
    return analyzed;
  }
}

/**
 * Deterministic pool quality score: rewards deep liquidity and real, volume-backed
 * APR, while penalising the adapter's per-pool risk. Sorted descending so the
 * first element is the strongest pick. Pure given the inputs, so reproducible.
 */
function poolScore(a: AnalyzedPool): number {
  const tvlScore = Math.log10(Math.max(a.pool.tvl, 1)) * 12; // ~0..84 over $1..$1B
  // Volume relative to TVL signals genuine fee generation, not headline APR.
  const utilization = a.pool.tvl > 0 ? a.pool.volume24h / a.pool.tvl : 0;
  const aprScore = Math.min(a.pool.apr, 80) * 0.4 + Math.min(utilization, 3) * 8;
  const riskPenalty = a.result.riskScore * 0.6;
  return tvlScore + aprScore - riskPenalty;
}

function rankPools(analyzed: readonly AnalyzedPool[]): AnalyzedPool[] {
  return [...analyzed].sort((x, y) => poolScore(y) - poolScore(x));
}

/**
 * Portfolio-level risk: the (TVL-weighted) average of the adapter's per-pool risk
 * scores. Falls back to a simple mean when no TVL is present.
 */
function deriveRisk(analyzed: readonly AnalyzedPool[]): number {
  const totalTvl = analyzed.reduce((sum, a) => sum + a.pool.tvl, 0);
  if (totalTvl <= 0) {
    const mean = analyzed.reduce((s, a) => s + a.result.riskScore, 0) / analyzed.length;
    return Math.round(mean);
  }
  const weighted = analyzed.reduce(
    (sum, a) => sum + a.result.riskScore * (a.pool.tvl / totalTvl),
    0,
  );
  return Math.round(weighted);
}

/**
 * Confidence: the average per-pool adapter confidence, nudged up by the breadth
 * of the comparison (more candidates = a more grounded recommendation).
 */
function deriveConfidence(analyzed: readonly AnalyzedPool[]): number {
  const mean = analyzed.reduce((s, a) => s + a.result.confidence, 0) / analyzed.length;
  return Math.round(mean + Math.min(8, (analyzed.length - 1) * 3));
}

/** Deterministic fallback used only on the offline mock path. */
function buildFallbackDecision(
  pools: readonly ByrealPool[],
  top: ByrealPool,
): ByrealLlmDecision {
  return {
    summary: `Compared ${pools.length} Byreal pool(s) by liquidity depth, fee APR and 24h volume; ${top.pair} offers the strongest risk-adjusted profile.`,
    topPick: {
      poolAddress: top.poolAddress,
      reason: `${top.pair} pairs $${top.tvl.toLocaleString()} TVL with ~${top.apr}% APR and $${top.volume24h.toLocaleString()} 24h volume — the best balance of depth and sustainable yield in the set.`,
    },
    poolReasoning: pools.map((p) => ({ poolAddress: p.poolAddress, reason: p.reason })),
    humanExplanation: `Across ${pools.length} Byreal pool(s), ${top.pair} is recommended for its combination of liquidity depth and volume-backed fee APR. Byreal is a Solana DEX; live LP execution is out of scope — this is analysis only.`,
  };
}

function reasonFor(poolAddress: string, decision: ByrealLlmDecision, fallback: string): string {
  const match = decision.poolReasoning.find((p) => p.poolAddress === poolAddress);
  return match?.reason ?? fallback;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
