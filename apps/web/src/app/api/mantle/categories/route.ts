import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle TVL-by-category aggregator, exposed to the browser as
 * `/api/mantle/categories`. Pulls the full public DefiLlama protocol list
 * (`https://api.llama.fi/protocols`, no API key), filters to protocols that are
 * live on Mantle with a numeric Mantle TVL, and buckets their TVL by protocol
 * category (e.g. Lending, Dexs, RWA, Yield Aggregator).
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ totalTvl, categories }`, with `categories` ranked by TVL descending. On a
 * failed upstream fetch or parse, a 502 is returned.
 */

const PROTOCOLS_URL = "https://api.llama.fi/protocols";

const FETCH_TIMEOUT_MS = 9000;

/**
 * Permissive schema for the upstream `/protocols` payload. The feed is large and
 * carries many extra fields; only what we need is modeled, everything else is
 * ignored. `chains` and `chainTvls` shapes vary, so they are loosely typed and
 * narrowed at the aggregation stage.
 */
const UpstreamProtocolSchema = z.object({
  name: z.string(),
  category: z.string().nullable().optional(),
  chains: z.array(z.string()).nullable().optional(),
  chainTvls: z.record(z.string(), z.unknown()).nullable().optional(),
});

const UpstreamSchema = z.array(UpstreamProtocolSchema);

export interface MantleCategory {
  readonly category: string;
  readonly tvl: number;
  readonly count: number;
}

interface CategoryBucket {
  tvl: number;
  count: number;
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
    const res = await fetchWithTimeout(PROTOCOLS_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${PROTOCOLS_URL} responded ${res.status}`);
    raw = (await res.json()) as unknown;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Category data unavailable" },
      { status: 502 },
    );
  }

  const parsed = UpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Category data unavailable" },
      { status: 502 },
    );
  }

  const buckets = new Map<string, CategoryBucket>();

  for (const p of parsed.data) {
    const mantleTvl = p.chainTvls?.Mantle;
    const isMantle =
      Array.isArray(p.chains) &&
      p.chains.includes("Mantle") &&
      typeof mantleTvl === "number" &&
      Number.isFinite(mantleTvl);
    if (!isMantle) continue;

    const category = p.category ?? "Other";
    const existing = buckets.get(category) ?? { tvl: 0, count: 0 };
    buckets.set(category, {
      tvl: existing.tvl + (mantleTvl as number),
      count: existing.count + 1,
    });
  }

  const categories: MantleCategory[] = Array.from(buckets.entries())
    .map(([category, bucket]) => ({
      category,
      tvl: bucket.tvl,
      count: bucket.count,
    }))
    .sort((a, b) => b.tvl - a.tvl);

  const totalTvl = categories.reduce((sum, c) => sum + c.tvl, 0);

  return NextResponse.json(
    { success: true, data: { totalTvl, categories } },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
