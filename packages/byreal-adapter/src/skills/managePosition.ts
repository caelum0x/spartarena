import {
  PositionInputSchema,
  PositionResultSchema,
  type PositionInput,
  type PositionResult,
} from "../types.js";
import {
  buildProof,
  clampScore,
  makeRng,
  round,
  seedFrom,
} from "./proof.js";
import type { SkillOptions } from "./analyzePool.js";

function toAmountString(value: number, decimals = 6): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  return value.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

/**
 * Pure, deterministic mock of the Byreal "position management" skill. Simulates
 * the result of opening, adjusting, rebalancing or closing an LP position.
 */
export function managePositionMock(
  rawInput: PositionInput,
  options: SkillOptions,
): PositionResult {
  const input = PositionInputSchema.parse(rawInput);
  const rng = makeRng(seedFrom(input));

  const positionId =
    input.positionId ??
    `pos-${seedFrom({ pool: input.poolAddress, action: input.action })
      .toString(16)
      .padStart(8, "0")}`;

  const requested = input.amount ? Number.parseFloat(input.amount) : 0;
  const baseLiquidity = round(1_000 + rng() * 50_000, 6);

  let liquidityNum: number;
  let status: PositionResult["status"];
  switch (input.action) {
    case "open":
    case "increase":
      liquidityNum = round(baseLiquidity + requested, 6);
      status = "open";
      break;
    case "decrease":
      liquidityNum = round(Math.max(baseLiquidity - requested, 0), 6);
      status = liquidityNum === 0 ? "closed" : "open";
      break;
    case "close":
      liquidityNum = 0;
      status = "closed";
      break;
    case "rebalance":
      liquidityNum = baseLiquidity;
      status = "rebalanced";
      break;
  }

  const valueUsd = round(liquidityNum * (0.8 + rng() * 0.6));
  const feesEarnedUsd = round(valueUsd * (0.001 + rng() * 0.05));
  const riskScore = clampScore(
    (status === "closed" ? 0 : 25) +
      (input.action === "rebalance" ? 10 : 0) +
      rng() * 25,
  );

  const recommendations: string[] = [];
  if (status === "closed") {
    recommendations.push("Position closed — claim any residual fees on-chain.");
  } else {
    recommendations.push(
      "Monitor price band; rebalance if the pair drifts outside your range.",
    );
    if (riskScore > 50) {
      recommendations.push(
        "Elevated risk — consider reducing size or tightening the range.",
      );
    }
    if (feesEarnedUsd > valueUsd * 0.02) {
      recommendations.push("Fee accrual is healthy; compounding is favorable.");
    }
  }

  const body = {
    chain: input.chain,
    positionId,
    poolAddress: input.poolAddress,
    action: input.action,
    status,
    liquidity: toAmountString(liquidityNum),
    valueUsd,
    feesEarnedUsd,
    riskScore,
    recommendations,
    humanSummary:
      `Position ${positionId} after "${input.action}": status ${status}, ` +
      `liquidity ${toAmountString(liquidityNum)}, value $${valueUsd.toLocaleString()}, ` +
      `unclaimed fees $${feesEarnedUsd.toLocaleString()}. Risk ${riskScore}/100.`,
  } as const;

  const result: PositionResult = {
    ...body,
    proof: buildProof("BYREAL_POSITION_MANAGEMENT", body, {
      recordedOnMantle: options.recordedOnMantle,
      source: "mock",
    }),
  };

  return PositionResultSchema.parse(result);
}
