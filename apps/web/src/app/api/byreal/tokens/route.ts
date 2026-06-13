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
 * Server-side Byreal token discovery board, exposed as `/api/byreal/tokens`.
 *
 * Reads the REAL Byreal (Solana) mint list server-side and ranks it through the
 * shared {@link buildTokenDiscovery} — the same deterministic, proof-hashed
 * discovery the ByrealPoolAnalyst Spartan uses. Works on Vercel with no separate
 * backend and no browser CORS. The best risk-adjusted token is flagged as the
 * top pick and carries the verifiable discovery proof.
 */

const TOKEN_LIMIT = 12;

/** Parse a Byreal money string to a finite number, or null when absent. */
function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const client = new ByrealRestClient();
    const mints = await client.listMints({
      sortField: "volumeUsd24h",
      sortType: "desc",
      pageSize: TOKEN_LIMIT,
    });

    const discovery = buildTokenDiscovery(mints, { chain: "solana", query: "trending" });
    const priceByMint = new Map(mints.map((m) => [m.address, toNumberOrNull(m.price)]));

    // Best risk-adjusted token: lowest risk, then deepest liquidity.
    let topIndex = -1;
    let bestScore = -Infinity;
    discovery.tokens.forEach((t, index) => {
      const score = t.liquidityScore - t.riskScore;
      if (score > bestScore) {
        bestScore = score;
        topIndex = index;
      }
    });

    const data: ByrealTokenView[] = discovery.tokens.map((t, index) => ({
      mint: t.address,
      symbol: t.symbol,
      name: t.name,
      priceUsd: priceByMint.get(t.address) ?? null,
      volume24hUsd: t.volume24hUsd,
      marketCapUsd: t.marketCapUsd > 0 ? t.marketCapUsd : null,
      priceChange24hPct: t.priceChange24hPct,
      liquidityScore: t.liquidityScore,
      riskScore: t.riskScore,
      reason: t.reason,
      topPick: index === topIndex,
      ...(index === topIndex
        ? {
            proof: {
              toolProofHash: discovery.proof.toolProofHash,
              recordedOnMantle: discovery.proof.recordedOnMantle,
            },
          }
        : {}),
    }));

    return NextResponse.json(
      {
        success: true,
        data,
        meta: { total: data.length, page: 1, limit: TOKEN_LIMIT },
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
          : "Failed to load Byreal tokens";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 502 },
    );
  }
}
