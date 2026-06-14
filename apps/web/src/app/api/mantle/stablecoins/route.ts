import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side Mantle stablecoins snapshot, exposed to the browser as
 * `/api/mantle/stablecoins`. Reads the public DefiLlama stablecoins endpoint
 * (no API key):
 *
 *   `https://stablecoins.llama.fi/stablecoins?includePrices=false`
 *
 * The response is `{ peggedAssets: Asset[] }` where each asset carries a
 * per-chain circulation map. We keep only assets with a positive Mantle
 * circulation (`chainCirculating.Mantle.current.peggedUSD`), sort by size,
 * take the top 20, and compute the total.
 *
 * Response is the standard `{ success, data }` envelope where `data` is
 * `{ totalUsd, assets }`; a failed upstream fetch yields a 502.
 */

const STABLECOINS_URL = "https://stablecoins.llama.fi/stablecoins?includePrices=false";

const FETCH_TIMEOUT_MS = 8000;
const TOP_N = 20;

/** Permissive schema for the `/stablecoins` payload (only fields we read). */
const PeggedAssetsSchema = z.object({
  peggedAssets: z.array(
    z.object({
      name: z.string().optional(),
      symbol: z.string().optional(),
      pegType: z.string().nullable().optional(),
      chainCirculating: z
        .object({
          Mantle: z
            .object({
              current: z
                .object({ peggedUSD: z.number().nullable().optional() })
                .nullable()
                .optional(),
            })
            .nullable()
            .optional(),
        })
        .passthrough()
        .nullable()
        .optional(),
    }),
  ),
});

export interface MantleStablecoinAsset {
  readonly symbol: string;
  readonly name: string;
  readonly mantleUsd: number;
  readonly pegType: string | null;
}

export interface MantleStablecoinsData {
  readonly totalUsd: number;
  readonly assets: MantleStablecoinAsset[];
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

/** Map the raw payload to the Mantle-only asset list + total. */
function buildData(raw: unknown): MantleStablecoinsData {
  const parsed = PeggedAssetsSchema.safeParse(raw);
  if (!parsed.success) return { totalUsd: 0, assets: [] };

  const assets: MantleStablecoinAsset[] = parsed.data.peggedAssets
    .map((a) => {
      const mantleUsd = a.chainCirculating?.Mantle?.current?.peggedUSD;
      if (typeof mantleUsd !== "number" || !(mantleUsd > 0)) return null;
      return {
        symbol: a.symbol ?? a.name ?? "—",
        name: a.name ?? a.symbol ?? "Unknown",
        mantleUsd,
        pegType: a.pegType ?? null,
      };
    })
    .filter((a): a is MantleStablecoinAsset => a !== null)
    .sort((x, y) => y.mantleUsd - x.mantleUsd);

  const totalUsd = assets.reduce((sum, a) => sum + a.mantleUsd, 0);

  return { totalUsd, assets: assets.slice(0, TOP_N) };
}

export async function GET() {
  let raw: unknown;
  try {
    raw = await fetchJson(STABLECOINS_URL);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Stablecoin data unavailable" },
      { status: 502 },
    );
  }

  const data = buildData(raw);

  return NextResponse.json(
    { success: true, data },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
