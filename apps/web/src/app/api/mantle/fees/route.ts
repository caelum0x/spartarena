import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle protocol fees snapshot, exposed to the browser as
 * `/api/mantle/fees`. Wraps the public DefiLlama fees overview endpoint
 * (no API key):
 *
 *   `https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`
 *
 * The upstream payload reports chain-wide `total24h` / `total7d` plus a
 * `protocols` array of individual fee-generating protocols. We map each
 * protocol to a compact `{ name, category, fees24h, fees7d }` shape, keep only
 * those with a positive 24h fee figure, sort by 24h fees descending and take
 * the top 25.
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ total24h, total7d, protocols }`. A failed upstream fetch yields a 502.
 */

const FEES_URL =
  "https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";

const FETCH_TIMEOUT_MS = 8000;
const TOP_N = 25;

/** Permissive schema for the upstream fees overview payload. */
const OverviewSchema = z.object({
  total24h: z.number().nullable().optional(),
  total7d: z.number().nullable().optional(),
  protocols: z
    .array(
      z.object({
        name: z.string().optional(),
        category: z.string().nullable().optional(),
        total24h: z.number().nullable().optional(),
        total7d: z.number().nullable().optional(),
      }),
    )
    .optional(),
});

export interface MantleFeeProtocol {
  readonly name: string;
  readonly category: string | null;
  readonly fees24h: number | null;
  readonly fees7d: number | null;
}

export interface MantleFeesData {
  readonly total24h: number | null;
  readonly total7d: number | null;
  readonly protocols: readonly MantleFeeProtocol[];
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
    const res = await fetchWithTimeout(FEES_URL, FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error(`${FEES_URL} responded ${res.status}`);

    const raw = (await res.json()) as unknown;
    const parsed = OverviewSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Malformed fees overview payload");

    const protocols: MantleFeeProtocol[] = (parsed.data.protocols ?? [])
      .map((p) => ({
        name: p.name ?? "Unknown",
        category: p.category ?? null,
        fees24h: p.total24h ?? null,
        fees7d: p.total7d ?? null,
      }))
      .filter(
        (p): p is MantleFeeProtocol & { fees24h: number } =>
          p.fees24h !== null && p.fees24h > 0,
      )
      .sort((a, b) => b.fees24h - a.fees24h)
      .slice(0, TOP_N);

    const data: MantleFeesData = {
      total24h: parsed.data.total24h ?? null,
      total7d: parsed.data.total7d ?? null,
      protocols,
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
      { success: false, data: null, error: "Fee data unavailable" },
      { status: 502 },
    );
  }
}
