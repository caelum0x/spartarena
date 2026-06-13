import {
  PoolAnalysisInputSchema,
  PoolAnalysisResultSchema,
  type PoolAnalysisInput,
  type PoolAnalysisResult,
} from "../types.js";
import {
  buildProof,
  clampScore,
  makeRng,
  round,
  seedFrom,
} from "./proof.js";

export interface SkillOptions {
  recordedOnMantle: boolean;
}

/**
 * Pure, deterministic mock of the Byreal "pool analysis" skill. Given the same
 * input it always returns the same realistic analysis, which keeps demos and
 * tests stable. Validates input at the boundary and the output before return.
 */
export function analyzePoolMock(
  rawInput: PoolAnalysisInput,
  options: SkillOptions,
): PoolAnalysisResult {
  const input = PoolAnalysisInputSchema.parse(rawInput);
  const rng = makeRng(seedFrom(input));

  const tvlUsd = round(50_000 + rng() * 4_950_000);
  // Keep mock utilization in a realistic [5, 100] band so synthetic volume never
  // exceeds TVL and downstream APR/risk derivations stay plausible.
  const utilizationPct = round(5 + rng() * 95);
  const volume24hUsd = round((tvlUsd * utilizationPct) / 100);
  const feeBps = [5, 30, 100][Math.floor(rng() * 3)] ?? 30;
  const estimatedAprPct = round(
    ((volume24hUsd * (feeBps / 10_000) * 365) / Math.max(tvlUsd, 1)) * 100,
  );

  // Thin liquidity and extreme utilization raise risk; deep liquidity lowers it.
  const liquidityRisk = tvlUsd < 250_000 ? 40 : tvlUsd < 1_000_000 ? 20 : 5;
  const utilizationRisk =
    utilizationPct > 90 ? 35 : utilizationPct < 10 ? 20 : 10;
  const riskScore = clampScore(liquidityRisk + utilizationRisk + rng() * 15);
  const confidence = clampScore(90 - riskScore * 0.4 + rng() * 8);

  const pairLabel =
    input.pairLabel ?? `POOL-${input.poolAddress.slice(2, 8).toUpperCase()}`;

  const signals: string[] = [];
  signals.push(
    tvlUsd >= 1_000_000
      ? "Deep liquidity reduces slippage and impermanent-loss volatility."
      : "Shallow liquidity — size positions carefully to limit price impact.",
  );
  signals.push(
    utilizationPct > 90
      ? "Very high utilization signals strong fee generation but elevated volatility."
      : utilizationPct < 10
        ? "Low utilization — fee yield is likely thin relative to TVL."
        : "Balanced utilization with steady fee accrual.",
  );
  signals.push(`Estimated fee APR ~${estimatedAprPct}% at ${feeBps}bps.`);

  const body = {
    chain: input.chain,
    poolAddress: input.poolAddress,
    pairLabel,
    tvlUsd,
    volume24hUsd,
    feeBps,
    estimatedAprPct,
    utilizationPct,
    riskScore,
    confidence,
    signals,
    humanSummary:
      `${pairLabel} holds $${tvlUsd.toLocaleString()} TVL with ` +
      `$${volume24hUsd.toLocaleString()} 24h volume (${utilizationPct}% utilization). ` +
      `At ${feeBps}bps fees this implies ~${estimatedAprPct}% APR. ` +
      `Risk score ${riskScore}/100, confidence ${confidence}/100.`,
  } as const;

  const result: PoolAnalysisResult = {
    ...body,
    proof: buildProof("BYREAL_POOL_ANALYSIS", body, {
      recordedOnMantle: options.recordedOnMantle,
      source: "mock",
    }),
  };

  return PoolAnalysisResultSchema.parse(result);
}
