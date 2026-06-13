import { z } from "zod";
import { getJson } from "../util/http-get.js";

/** CoinGecko ids for the assets we track. */
export const COINGECKO_IDS = {
  MNT: "mantle",
  mETH: "mantle-staked-ether",
  USDY: "ondo-us-dollar-yield",
  USDT: "tether",
  USDC: "usd-coin",
} as const;

/** DefiLlama pool UUIDs named in production-context for canonical APYs. */
export const DEFILLAMA_POOLS = {
  USDY: "b5d7a190-38d2-4fdd-8c14-1fd00c11bce1",
  mETH: "b9f2f00a-ba96-4589-a171-dde979a23d87",
} as const;

const CoinGeckoEntrySchema = z.object({
  usd: z.number().optional(),
  usd_24h_change: z.number().optional(),
});
const CoinGeckoResponseSchema = z.record(z.string(), CoinGeckoEntrySchema);
export type CoinGeckoPrices = z.infer<typeof CoinGeckoResponseSchema>;

const DefiLlamaPoolSchema = z.object({
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number().nullable().optional(),
  apy: z.number().nullable().optional(),
  apyBase: z.number().nullable().optional(),
  apyReward: z.number().nullable().optional(),
  pool: z.string(),
  stablecoin: z.boolean().optional(),
  ilRisk: z.string().optional(),
  apyMean30d: z.number().nullable().optional(),
});
export type DefiLlamaPool = z.infer<typeof DefiLlamaPoolSchema>;

const DefiLlamaPoolsResponseSchema = z.object({
  status: z.string(),
  data: z.array(DefiLlamaPoolSchema),
});

/** Fetch USD prices + 24h change for the given CoinGecko ids. */
export async function fetchCoinGeckoPrices(ids: readonly string[]): Promise<CoinGeckoPrices> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }

  const raw = await getJson(url.toString(), headers);
  return CoinGeckoResponseSchema.parse(raw);
}

/** Fetch the full DefiLlama pool list (validated). */
export async function fetchAllPools(): Promise<DefiLlamaPool[]> {
  const raw = await getJson("https://yields.llama.fi/pools", {}, 30_000);
  return DefiLlamaPoolsResponseSchema.parse(raw).data;
}

/** Fetch all DefiLlama pools, filtered to `chain === "Mantle"`. */
export async function fetchMantlePools(): Promise<DefiLlamaPool[]> {
  return (await fetchAllPools()).filter((p) => p.chain === "Mantle");
}

/**
 * Look up the canonical APY for a named pool (USDY / mETH) from the full pool
 * list. Prefers `apyBase`, falling back to `apy`/`apyMean30d`. Returns 0 if the
 * pool is not present in the response.
 */
export function poolApy(pools: readonly DefiLlamaPool[], poolUuid: string): number {
  const match = pools.find((p) => p.pool === poolUuid);
  if (!match) {
    return 0;
  }
  return match.apyBase ?? match.apy ?? match.apyMean30d ?? 0;
}

const LlamaPriceSchema = z.object({
  coins: z.record(
    z.string(),
    z.object({
      price: z.number(),
      symbol: z.string().optional(),
      confidence: z.number().optional(),
    }),
  ),
});

/** Fetch current prices for `coins.llama.fi` keys (e.g. "mantle:0x..", "coingecko:mantle"). */
export async function fetchLlamaPrices(
  keys: readonly string[],
): Promise<Record<string, { price: number }>> {
  if (keys.length === 0) {
    return {};
  }
  const url = `https://coins.llama.fi/prices/current/${keys.join(",")}`;
  const raw = await getJson(url);
  return LlamaPriceSchema.parse(raw).coins;
}
