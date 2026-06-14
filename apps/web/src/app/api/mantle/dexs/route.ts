import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle DEX volume snapshot, exposed to the browser as
 * `/api/mantle/dexs`. Wraps the public DefiLlama DEX overview endpoint
 * (no API key):
 *
 *   `https://api.llama.fi/overview/dexs/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`
 *
 * The upstream payload reports chain-wide `total24h` / `total7d` plus a
 * `protocols` array of individual DEXs. We map each protocol to a compact
 * `{ name, vol24h, vol7d, change7dOver7d }` shape, keep only those with a
 * positive 24h volume, sort by 24h volume descending and take the top 25.
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ total24h, total7d, dexs }`. A failed upstream fetch yields a 502.
 */

const DEXS_URL =
  "https://api.llama.fi/overview/dexs/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";

const FETCH_TIMEOUT_MS = 8000;
const TOP_N = 25;

/** Permissive schema for the upstream DEX overview payload. */
const OverviewSchema = z.object({
  total24h: z.number().nullable().optional(),
  total7d: z.number().nullable().optional(),
  protocols: z
    .array(
      z.object({
        name: z.string().optional(),
        total24h: z.number().nullable().optional(),
        total7d: z.number().nullable().optional(),
        change_7dover7d: z.number().nullable().optional(),
        category: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export interface MantleDex {
  readonly name: string;
  readonly vol24h: number | null;
  readonly vol7d: number | null;
  readonly change7dOver7d: number | null;
}

export interface MantleDexsData {
  readonly total24h: number | null;
  readonly total7d: number | null;
  readonly dexs: readonly MantleDex[];
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
    const res = await fetchWithTimeout(DEXS_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${DEXS_URL} responded ${res.status}`);

    const raw = (await res.json()) as unknown;
    const parsed = OverviewSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Malformed DEX overview payload");

    const dexs: MantleDex[] = (parsed.data.protocols ?? [])
      .map((p) => ({
        name: p.name ?? "Unknown",
        vol24h: p.total24h ?? null,
        vol7d: p.total7d ?? null,
        change7dOver7d: p.change_7dover7d ?? null,
      }))
      .filter((d): d is MantleDex & { vol24h: number } => d.vol24h !== null && d.vol24h > 0)
      .sort((a, b) => b.vol24h - a.vol24h)
      .slice(0, TOP_N);

    const data: MantleDexsData = {
      total24h: parsed.data.total24h ?? null,
      total7d: parsed.data.total7d ?? null,
      dexs,
    };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "cache-control": "public, max-age=300, stale-while-revalidate=900",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "DEX volume data unavailable" },
      { status: 502 },
    );
  }
}
