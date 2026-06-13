import { NextResponse } from "next/server";
import { LiveByrealAdapter, ByrealRequestError } from "@spartarena/byreal-adapter";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Server-side Byreal swap-quote PREVIEW, exposed as `/api/byreal/swap-preview`.
 *
 * Returns a REAL, non-executable Byreal (Solana) router quote — expected output,
 * price impact, minimum received, route and a risk read — plus a verifiable
 * proof hash. No wallet is attached, so nothing is executable here; live LP/swap
 * execution is Solana-side and out of scope. Query params:
 *   tokenIn, tokenOut  symbol or mint address
 *   amountIn           decimal amount of tokenIn
 *   slippageBps        optional, default 50
 */

const MAX_AMOUNT_LEN = 32;

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, data: null, error: message }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const tokenIn = params.get("tokenIn")?.trim() ?? "";
  const tokenOut = params.get("tokenOut")?.trim() ?? "";
  const amountIn = params.get("amountIn")?.trim() ?? "";
  const slippageRaw = params.get("slippageBps")?.trim();

  if (!tokenIn || !tokenOut) return bad("tokenIn and tokenOut are required");
  if (tokenIn.toUpperCase() === tokenOut.toUpperCase()) {
    return bad("tokenIn and tokenOut must differ");
  }
  if (!/^\d*\.?\d+$/.test(amountIn) || amountIn.length > MAX_AMOUNT_LEN) {
    return bad("amountIn must be a positive decimal");
  }
  if (Number.parseFloat(amountIn) <= 0) return bad("amountIn must be greater than zero");

  const slippageBps =
    slippageRaw && /^\d+$/.test(slippageRaw)
      ? Math.min(5000, Math.max(1, Number.parseInt(slippageRaw, 10)))
      : 50;

  try {
    const adapter = new LiveByrealAdapter();
    const result = await adapter.previewSwap({
      chain: "solana",
      tokenIn,
      tokenOut,
      amountIn,
      slippageBps,
    });

    const data = {
      tokenIn: result.tokenIn,
      tokenOut: result.tokenOut,
      amountIn: result.amountIn,
      expectedAmountOut: result.expectedAmountOut,
      minAmountOut: result.minAmountOut,
      executionPrice: result.executionPrice,
      priceImpactPct: result.priceImpactPct,
      route: result.route,
      slippageBps: result.slippageBps,
      riskScore: result.riskScore,
      humanSummary: result.humanSummary,
      proof: {
        toolProofHash: result.proof.toolProofHash,
        recordedOnMantle: result.proof.recordedOnMantle,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to preview swap";
    return NextResponse.json({ success: false, data: null, error: message }, { status: 502 });
  }
}
