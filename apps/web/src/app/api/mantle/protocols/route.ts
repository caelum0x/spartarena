import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle protocol aggregator, exposed to the browser as
 * `/api/mantle/protocols`. Pulls the full public DefiLlama protocol list
 * (`https://api.llama.fi/protocols`, no API key), filters to protocols that are
 * live on Mantle with a numeric Mantle TVL, ranks by Mantle TVL and returns the
 * top protocols.
 *
 * Response is the standard `{ success, data }` envelope where `data` is an
 * array of `MantleProtocol`. On a failed upstream fetch a 502 is returned.
 */

const PROTOCOLS_URL = "https://api.llama.fi/protocols";

const FETCH_TIMEOUT_MS = 9000;
const MAX_PROTOCOLS = 30;

/**
 * Permissive schema for the upstream `/protocols` payload. The feed is large and
 * carries many extra fields; only what we need is modeled, everything else is
 * ignored. `chains` and `chainTvls` shapes vary, so they are loosely typed and
 * narrowed at the filter stage.
 */
const UpstreamProtocolSchema = z.object({
  name: z.string(),
  slug: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  chains: z.array(z.string()).nullable().optional(),
  chainTvls: z.record(z.string(), z.unknown()).nullable().optional(),
  logo: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

const UpstreamSchema = z.array(UpstreamProtocolSchema);

export interface MantleProtocol {
  readonly name: string;
  readonly slug: string | null;
  readonly category: string | null;
  readonly mantleTvl: number;
  readonly logo: string | null;
  readonly url: string | null;
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
      { success: false, data: null, error: "Protocol data unavailable" },
      { status: 502 },
    );
  }

  const parsed = UpstreamSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Protocol data unavailable" },
      { status: 502 },
    );
  }

  const data: MantleProtocol[] = parsed.data
    .filter(
      (p) =>
        Array.isArray(p.chains) &&
        p.chains.includes("Mantle") &&
        typeof p.chainTvls?.Mantle === "number" &&
        Number.isFinite(p.chainTvls.Mantle as number),
    )
    .map((p) => ({
      name: p.name,
      slug: p.slug ?? null,
      category: p.category ?? null,
      mantleTvl: p.chainTvls!.Mantle as number,
      logo: p.logo ?? null,
      url: p.url ?? null,
    }))
    .sort((a, b) => b.mantleTvl - a.mantleTvl)
    .slice(0, MAX_PROTOCOLS);

  return NextResponse.json(
    { success: true, data },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
