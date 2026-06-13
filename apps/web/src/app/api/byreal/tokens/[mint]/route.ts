import { NextResponse } from "next/server";
import {
  ByrealRestClient,
  ByrealRequestError,
  buildTokenDiscovery,
} from "@spartarena/byreal-adapter";
import type { ByrealTokenView } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * A single Byreal token, analysed — `/api/byreal/tokens/<mintAddress>`.
 *
 * Resolves the mint from the REAL Byreal list (address search) and ranks it
 * through the shared `buildTokenDiscovery`, returning the same `ByrealTokenView`
 * shape as the board plus a verifiable proof. Works on Vercel with no backend.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ mint: string }> },
): Promise<NextResponse> {
  const { mint } = await ctx.params;
  if (!mint || mint.length < 8) {
    return NextResponse.json(
      { success: false, data: null, error: "A valid mint address is required" },
      { status: 400 },
    );
  }

  function num(value: string | undefined): number | null {
    if (value === undefined || value === "") return null;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }

  try {
    const client = new ByrealRestClient();
    const candidates = await client.listMints({ searchKey: mint, pageSize: 10 });
    const found = candidates.find((m) => m.address === mint) ?? candidates[0];

    if (!found || found.address !== mint) {
      return NextResponse.json(
        { success: false, data: null, error: "Token not found on Byreal" },
        { status: 404 },
      );
    }

    const discovery = buildTokenDiscovery([found], { chain: "solana", query: "token-detail" });
    const t = discovery.tokens[0]!;

    const data: ByrealTokenView = {
      mint: t.address,
      symbol: t.symbol,
      name: t.name,
      priceUsd: num(found.price),
      volume24hUsd: t.volume24hUsd,
      marketCapUsd: t.marketCapUsd > 0 ? t.marketCapUsd : null,
      priceChange24hPct: t.priceChange24hPct,
      liquidityScore: t.liquidityScore,
      riskScore: t.riskScore,
      reason: t.reason,
      proof: {
        toolProofHash: discovery.proof.toolProofHash,
        recordedOnMantle: discovery.proof.recordedOnMantle,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to load Byreal token";
    return NextResponse.json({ success: false, data: null, error: message }, { status: 502 });
  }
}
