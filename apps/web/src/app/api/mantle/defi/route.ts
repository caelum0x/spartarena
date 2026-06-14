import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle DeFi snapshot, exposed to the browser as
 * `/api/mantle/defi`. Aggregates three public DefiLlama endpoints (no API key):
 *
 *  1. `https://api.llama.fi/v2/chains` — current chain TVL.
 *  2. `https://api.llama.fi/v2/historicalChainTvl/Mantle` — daily TVL history.
 *  3. `https://stablecoins.llama.fi/stablecoinchains` — stablecoin circulation.
 *
 * Sources are fetched with `Promise.allSettled` so a single failing feed
 * degrades gracefully rather than taking the whole response down. Only a failed
 * chains fetch (the primary signal) is treated as a total failure (502).
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ tvlUsd, stablecoinsUsd, tvlChange30dPct, tvlHistory }`.
 */

const CHAINS_URL = "https://api.llama.fi/v2/chains";
const HISTORY_URL = "https://api.llama.fi/v2/historicalChainTvl/Mantle";
const STABLES_URL = "https://stablecoins.llama.fi/stablecoinchains";

const FETCH_TIMEOUT_MS = 7000;
const HISTORY_WINDOW = 90;

/** Schema for the `/v2/chains` array (only the fields we read). */
const ChainsSchema = z.array(
  z.object({
    name: z.string().optional(),
    tvl: z.number().nullable().optional(),
  }),
);

/** Schema for the `/v2/historicalChainTvl/{chain}` array. */
const HistorySchema = z.array(
  z.object({
    date: z.number(),
    tvl: z.number(),
  }),
);

/** Schema for the `/stablecoinchains` array (only the fields we read). */
const StablecoinChainsSchema = z.array(
  z.object({
    name: z.string().optional(),
    totalCirculatingUSD: z
      .object({ peggedUSD: z.number().nullable().optional() })
      .nullable()
      .optional(),
  }),
);

export interface MantleDefiData {
  readonly tvlUsd: number | null;
  readonly stablecoinsUsd: number | null;
  readonly tvlChange30dPct: number | null;
  readonly tvlHistory: number[];
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as unknown;
}

/** Mantle chain TVL from `/v2/chains`, or null when absent. */
function readChainTvl(raw: unknown): number | null {
  const parsed = ChainsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const mantle = parsed.data.find((c) => c.name === "Mantle");
  return mantle?.tvl ?? null;
}

/** Mantle stablecoin circulation (peggedUSD) from `/stablecoinchains`, or null. */
function readStablecoins(raw: unknown): number | null {
  const parsed = StablecoinChainsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const mantle = parsed.data.find((c) => c.name === "Mantle");
  return mantle?.totalCirculatingUSD?.peggedUSD ?? null;
}

/** Last `HISTORY_WINDOW` daily TVL numbers from the historical array. */
function readHistory(raw: unknown): number[] {
  const parsed = HistorySchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.map((p) => p.tvl).slice(-HISTORY_WINDOW);
}

/**
 * 30-day percentage change computed from the full historical TVL series.
 * Returns null when there is insufficient history or the baseline is zero.
 */
function read30dChangePct(raw: unknown): number | null {
  const parsed = HistorySchema.safeParse(raw);
  if (!parsed.success) return null;
  const tvls = parsed.data.map((p) => p.tvl);
  const len = tvls.length;
  if (len < 31) return null;
  const prev = tvls[len - 31];
  const last = tvls[len - 1];
  if (prev === undefined || last === undefined || prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

export async function GET() {
  const [chainsResult, historyResult, stablesResult] = await Promise.allSettled([
    fetchJson(CHAINS_URL),
    fetchJson(HISTORY_URL),
    fetchJson(STABLES_URL),
  ]);

  // A failed chains fetch is the only total-failure condition.
  if (chainsResult.status !== "fulfilled") {
    return NextResponse.json(
      { success: false, data: null, error: "DeFi data unavailable" },
      { status: 502 },
    );
  }

  const tvlUsd = readChainTvl(chainsResult.value);

  const historyRaw = historyResult.status === "fulfilled" ? historyResult.value : null;
  const tvlHistory = historyRaw ? readHistory(historyRaw) : [];
  const tvlChange30dPct = historyRaw ? read30dChangePct(historyRaw) : null;

  const stablecoinsUsd =
    stablesResult.status === "fulfilled" ? readStablecoins(stablesResult.value) : null;

  const data: MantleDefiData = {
    tvlUsd,
    stablecoinsUsd,
    tvlChange30dPct,
    tvlHistory,
  };

  return NextResponse.json(
    { success: true, data },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
