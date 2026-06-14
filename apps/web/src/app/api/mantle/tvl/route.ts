import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle TVL history, exposed to the browser as `/api/mantle/tvl`.
 * Backed by a single public DefiLlama endpoint (no API key):
 *
 *  `https://api.llama.fi/v2/historicalChainTvl/Mantle`
 *    → array of `{ date: number (unix seconds), tvl: number }`, ~daily since 2023.
 *
 * The full series is mapped to `{ date, tvl }[]` with non-finite points filtered
 * out, then returned in the standard `{ success, data }` envelope where `data`
 * is `{ series }`. A failed or malformed fetch degrades to a 502.
 */

const HISTORY_URL = "https://api.llama.fi/v2/historicalChainTvl/Mantle";

const FETCH_TIMEOUT_MS = 8000;

/** Permissive schema for the `/v2/historicalChainTvl/{chain}` array. */
const HistorySchema = z.array(
  z.object({
    date: z.number(),
    tvl: z.number(),
  }),
);

export interface MantleTvlPoint {
  readonly date: number;
  readonly tvl: number;
}

export interface MantleTvlData {
  readonly series: MantleTvlPoint[];
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  try {
    const res = await fetchWithTimeout(HISTORY_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${HISTORY_URL} responded ${res.status}`);

    const raw: unknown = await res.json();
    const parsed = HistorySchema.safeParse(raw);
    if (!parsed.success) throw new Error("Unexpected TVL history shape");

    const series: MantleTvlPoint[] = parsed.data
      .filter((p) => Number.isFinite(p.date) && Number.isFinite(p.tvl))
      .map((p) => ({ date: p.date, tvl: p.tvl }));

    const data: MantleTvlData = { series };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "cache-control": "public, max-age=600, stale-while-revalidate=1200",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "TVL history unavailable" },
      { status: 502 },
    );
  }
}
