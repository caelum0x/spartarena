import { NextResponse } from "next/server";
import { LiveByrealAdapter, ByrealRequestError } from "@spartarena/byreal-adapter";
import type { ByrealPoolView } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Single Byreal pool, analysed — `/api/byreal/pools/<poolAddress>`.
 *
 * Runs the REAL ByrealPoolAnalyst analysis for one pool (detail endpoint with a
 * pools-list fallback, both handled by the adapter) and returns the same
 * `ByrealPoolView` shape as the board, with a verifiable proof hash. Works on
 * Vercel with no separate backend.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
  const { address } = await ctx.params;
  if (!address || address.length < 8) {
    return NextResponse.json(
      { success: false, data: null, error: "A valid pool address is required" },
      { status: 400 },
    );
  }

  try {
    const adapter = new LiveByrealAdapter();
    const a = await adapter.analyzePool({ chain: "solana", poolAddress: address });

    const data: ByrealPoolView = {
      poolAddress: a.poolAddress,
      pairLabel: a.pairLabel,
      tvlUsd: a.tvlUsd,
      volume24hUsd: a.volume24hUsd,
      feeBps: a.feeBps,
      estimatedAprPct: a.estimatedAprPct,
      utilizationPct: a.utilizationPct,
      riskScore: a.riskScore,
      confidence: a.confidence,
      signals: a.signals,
      humanSummary: a.humanSummary,
      proof: {
        toolProofHash: a.proof.toolProofHash,
        recordedOnMantle: a.proof.recordedOnMantle,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const notFound = error instanceof Error && /not found/i.test(error.message);
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to load Byreal pool";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: notFound ? 404 : 502 },
    );
  }
}
