import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side chain-ranking aggregator, exposed to the browser as
 * `/api/mantle/chains`. Pulls the full public DefiLlama chains list
 * (`https://api.llama.fi/v2/chains`, no API key), sorts every chain by total
 * value locked descending, and computes where Mantle ranks among all chains.
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ mantleRank, totalChains, mantleTvl, topChains }`. `topChains` holds the top
 * 15 chains (with an extra flagged Mantle entry appended when Mantle ranks below
 * the top 15 but is still present). On a failed upstream fetch or parse, a 502
 * is returned.
 */

const CHAINS_URL = "https://api.llama.fi/v2/chains";

const FETCH_TIMEOUT_MS = 8000;

const TOP_N = 15;

const MANTLE_NAME = "Mantle";

/**
 * Permissive schema for the upstream `/v2/chains` payload. The feed carries many
 * extra fields; only what we need is modeled, everything else is ignored.
 */
const UpstreamChainSchema = z.object({
  name: z.string(),
  tvl: z.number().nullable().optional(),
  tokenSymbol: z.string().nullable().optional(),
  gecko_id: z.string().nullable().optional(),
});

const UpstreamSchema = z.array(UpstreamChainSchema);

export interface TopChain {
  readonly name: string;
  readonly tvl: number;
  readonly isMantle: boolean;
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
  let raw: unknown;
  try {
    const res = await fetchWithTimeout(CHAINS_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${CHAINS_URL} responded ${res.status}`);
    raw = (await res.json()) as unknown;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Chain data unavailable" },
      { status: 502 },
    );
  }

  const parsed = UpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Chain data unavailable" },
      { status: 502 },
    );
  }

  const ranked = parsed.data
    .map((c) => ({ name: c.name, tvl: c.tvl }))
    .filter(
      (c): c is { name: string; tvl: number } =>
        typeof c.tvl === "number" && Number.isFinite(c.tvl),
    )
    .sort((a, b) => b.tvl - a.tvl);

  const totalChains = ranked.length;

  const mantleIndex = ranked.findIndex((c) => c.name === MANTLE_NAME);
  const mantleRank = mantleIndex >= 0 ? mantleIndex + 1 : null;
  const mantleTvl = mantleIndex >= 0 ? ranked[mantleIndex]!.tvl : null;

  const topChains: TopChain[] = ranked.slice(0, TOP_N).map((c) => ({
    name: c.name,
    tvl: c.tvl,
    isMantle: c.name === MANTLE_NAME,
  }));

  // Mantle exists but ranks below the top N — append a flagged entry so the UI
  // can show it as a separate highlighted row.
  if (mantleIndex >= TOP_N) {
    topChains.push({
      name: MANTLE_NAME,
      tvl: ranked[mantleIndex]!.tvl,
      isMantle: true,
    });
  }

  return NextResponse.json(
    { success: true, data: { mantleRank, totalChains, mantleTvl, topChains } },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
