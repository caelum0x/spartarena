import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side token price endpoint (CoinGecko-driven), exposed to the browser as
 * `/api/prices`. Runs on the server so the optional CoinGecko demo key
 * (`COINGECKO_API_KEY`, NOT a NEXT_PUBLIC_* var) never reaches the client.
 *
 * Resolution order:
 *  1. The `@spartarena/api` backend at `${NEXT_PUBLIC_API_URL}/prices` (preferred —
 *     the backend owns market data + caching). If it returns our envelope, proxy it.
 *  2. Fall back to CoinGecko's `simple/price` directly (server-side fetch).
 *
 * Response is the standard `{ success, data }` envelope where `data` maps a
 * canonical symbol (MNT, mETH, USDY, USDT, USDC) to `{ usd, usd24hChange }`.
 */

/** CoinGecko coin ids keyed by the symbols the UI shows. */
const COINGECKO_IDS = {
  MNT: "mantle",
  mETH: "mantle-staked-ether",
  USDY: "ondo-us-dollar-yield",
  USDT: "tether",
  USDC: "usd-coin",
} as const;

type Symbol = keyof typeof COINGECKO_IDS;

export interface TokenPrice {
  readonly usd: number;
  readonly usd24hChange: number;
}

export type PriceMap = Readonly<Record<Symbol, TokenPrice>>;

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  `?ids=${Object.values(COINGECKO_IDS).join(",")}` +
  "&vs_currencies=usd&include_24hr_change=true";

/** Schema for CoinGecko's `simple/price` response (only the fields we read). */
const CoinGeckoPriceSchema = z.record(
  z.object({
    usd: z.number(),
    usd_24h_change: z.number().optional(),
  }),
);

/** Schema for the backend's price envelope (best-effort proxy). */
const BackendPriceEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.record(
    z.object({
      usd: z.number(),
      usd24hChange: z.number().optional(),
    }),
  ),
});

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** Try the backend first; returns a validated price map or undefined. */
async function fromBackend(): Promise<PriceMap | undefined> {
  try {
    const res = await fetchWithTimeout(
      `${env.apiUrl}/prices`,
      { headers: { accept: "application/json" } },
      4000,
    );
    if (!res.ok) return undefined;
    const json: unknown = await res.json();
    const parsed = BackendPriceEnvelopeSchema.safeParse(json);
    if (!parsed.success || !parsed.data.success) return undefined;
    const out: Partial<Record<Symbol, TokenPrice>> = {};
    for (const symbol of Object.keys(COINGECKO_IDS) as Symbol[]) {
      const entry = parsed.data.data[symbol];
      if (entry) out[symbol] = { usd: entry.usd, usd24hChange: entry.usd24hChange ?? 0 };
    }
    return isComplete(out) ? (out as PriceMap) : undefined;
  } catch {
    return undefined;
  }
}

/** Fall back to CoinGecko directly (server-side; optional demo key from env). */
async function fromCoinGecko(): Promise<PriceMap> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const res = await fetchWithTimeout(COINGECKO_URL, { headers }, 6000);
  if (!res.ok) {
    throw new Error(`CoinGecko responded ${res.status}`);
  }
  const json: unknown = await res.json();
  const parsed = CoinGeckoPriceSchema.parse(json);

  const out: Partial<Record<Symbol, TokenPrice>> = {};
  for (const [symbol, id] of Object.entries(COINGECKO_IDS) as [Symbol, string][]) {
    const entry = parsed[id];
    if (entry) out[symbol] = { usd: entry.usd, usd24hChange: entry.usd_24h_change ?? 0 };
  }
  return out as PriceMap;
}

function isComplete(map: Partial<Record<Symbol, TokenPrice>>): boolean {
  return (Object.keys(COINGECKO_IDS) as Symbol[]).every((s) => map[s] !== undefined);
}

export async function GET() {
  try {
    const backend = await fromBackend();
    const data = backend ?? (await fromCoinGecko());
    return NextResponse.json(
      { success: true, data },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load prices";
    return NextResponse.json({ success: false, data: null, error: message }, { status: 502 });
  }
}
