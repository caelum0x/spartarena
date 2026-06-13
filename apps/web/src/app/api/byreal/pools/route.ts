import { NextResponse } from "next/server";
import {
  ByrealRestClient,
  ByrealRequestError,
  analyzePoolInfo,
  type PoolAnalysisResult,
  type SimplePoolInfo,
} from "@spartarena/byreal-adapter";
import type { ByrealPoolView } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Byreal's REST client uses Node `fetch` + viem; keep this on the Node runtime.
export const runtime = "nodejs";

/**
 * Server-side Byreal pool board, exposed to the browser as `/api/byreal/pools`.
 *
 * Byreal is a SOLANA DEX. This route hits the REAL Byreal REST API server-side
 * (`https://api2.byreal.io`, no auth needed for reads) so it works on Vercel
 * with no separate `@spartarena/api` backend and with no browser CORS. Each pool
 * is run through the shared {@link analyzePoolInfo} — the SAME deterministic,
 * proof-hashed analysis the ByrealPoolAnalyst Spartan uses — and the best
 * risk-adjusted pool is flagged as the top pick.
 *
 * Response is the standard `{ success, data, meta }` envelope where `data` is a
 * `ByrealPoolView[]`. Upstream failures surface as `{ success: false, error }`
 * with HTTP 502 so the UI shows a real error state instead of fabricating data.
 */

/** How many top-TVL pools to surface on the board. */
const POOL_LIMIT = 8;

/** Map a full analysis result to the render-ready view consumed by the web app. */
function toView(
  analysis: PoolAnalysisResult,
  topPick: boolean,
  pool: SimplePoolInfo,
): ByrealPoolView {
  return {
    poolAddress: analysis.poolAddress,
    pairLabel: analysis.pairLabel,
    ...(pool.mintA ? { mintA: pool.mintA } : {}),
    ...(pool.mintB ? { mintB: pool.mintB } : {}),
    tvlUsd: analysis.tvlUsd,
    volume24hUsd: analysis.volume24hUsd,
    feeBps: analysis.feeBps,
    estimatedAprPct: analysis.estimatedAprPct,
    utilizationPct: analysis.utilizationPct,
    riskScore: analysis.riskScore,
    confidence: analysis.confidence,
    signals: analysis.signals,
    humanSummary: analysis.humanSummary,
    topPick,
    proof: {
      toolProofHash: analysis.proof.toolProofHash,
      recordedOnMantle: analysis.proof.recordedOnMantle,
    },
  };
}

/** Risk-adjusted score used to surface the single top pick of the set. */
function pickScore(analysis: PoolAnalysisResult): number {
  return analysis.estimatedAprPct * (1 - analysis.riskScore / 100);
}

export async function GET() {
  try {
    const client = new ByrealRestClient();
    const pools = await client.listPools({
      sortField: "tvl",
      sortType: "desc",
      pageSize: POOL_LIMIT,
    });

    const valid = pools.filter((pool) => pool.poolAddress);
    const analyses = valid.map((pool) => analyzePoolInfo(pool, { chain: "solana" }));

    // Flag the best risk-adjusted pool (with real TVL) as the top pick.
    let topIndex = -1;
    let topScore = -Infinity;
    analyses.forEach((analysis, index) => {
      if (analysis.tvlUsd <= 0) return;
      const score = pickScore(analysis);
      if (score > topScore) {
        topScore = score;
        topIndex = index;
      }
    });

    const data = analyses.map((analysis, index) =>
      toView(analysis, index === topIndex, valid[index]!),
    );

    return NextResponse.json(
      {
        success: true,
        data,
        meta: { total: data.length, page: 1, limit: POOL_LIMIT },
      },
      {
        headers: {
          "cache-control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to load Byreal pools";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 502 },
    );
  }
}
