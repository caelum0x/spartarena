import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle yields aggregator, exposed to the browser as
 * `/api/mantle/yields`. Pulls the full public DefiLlama yields pool list
 * (`https://yields.llama.fi/pools`, no API key), filters to Mantle pools with
 * meaningful TVL, ranks by APY and returns the top opportunities.
 *
 * Response is the standard `{ success, data }` envelope where `data` is an
 * array of `MantleYieldPool`. On a failed upstream fetch a 502 is returned.
 */

const POOLS_URL = "https://yields.llama.fi/pools";

const FETCH_TIMEOUT_MS = 9000;
const MIN_TVL_USD = 50_000;
const MAX_POOLS = 30;

/**
 * Permissive schema for the upstream `/pools` payload. Numeric fields may be
 * null in the feed, so they are nullable; unknown extra fields are ignored.
 */
const UpstreamPoolSchema = z.object({
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number().nullable().optional(),
  apy: z.number().nullable().optional(),
  apyBase: z.number().nullable().optional(),
  apyReward: z.number().nullable().optional(),
  stablecoin: z.boolean().nullable().optional(),
  ilRisk: z.string().nullable().optional(),
  exposure: z.string().nullable().optional(),
  poolMeta: z.string().nullable().optional(),
  pool: z.string(),
});

const UpstreamSchema = z.object({
  data: z.array(UpstreamPoolSchema),
});

export interface MantleYieldPool {
  readonly id: string;
  readonly project: string;
  readonly symbol: string;
  readonly tvlUsd: number;
  readonly apy: number;
  readonly apyBase: number | null;
  readonly apyReward: number | null;
  readonly stablecoin: boolean;
  readonly ilRisk: string | null;
  readonly exposure: string | null;
  readonly poolMeta: string | null;
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
    const res = await fetchWithTimeout(POOLS_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${POOLS_URL} responded ${res.status}`);
    raw = (await res.json()) as unknown;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Yield data unavailable" },
      { status: 502 },
    );
  }

  const parsed = UpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Yield data unavailable" },
      { status: 502 },
    );
  }

  const data: MantleYieldPool[] = parsed.data.data
    .filter((p) => p.chain === "Mantle" && (p.tvlUsd ?? 0) >= MIN_TVL_USD)
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, MAX_POOLS)
    .map((p) => ({
      id: p.pool,
      project: p.project,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd ?? 0,
      apy: p.apy ?? 0,
      apyBase: p.apyBase ?? null,
      apyReward: p.apyReward ?? null,
      stablecoin: !!p.stablecoin,
      ilRisk: p.ilRisk ?? null,
      exposure: p.exposure ?? null,
      poolMeta: p.poolMeta ?? null,
    }));

  return NextResponse.json(
    { success: true, data },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
