import { z } from "zod";
import { env } from "../../../env.js";
import { childLogger } from "../../../lib/logger.js";
import { UpstreamError } from "../../../lib/errors.js";
import type { ToolCall } from "../execution.types.js";

/**
 * Real market + yield data reader for YieldStrategist.
 *
 * Prices and 24h change come from CoinGecko's free `simple/price` endpoint;
 * yields/APY come from DefiLlama's `pools` feed filtered to Mantle. From these
 * we derive a conservative per-asset snapshot (volatility proxy from |24h change|,
 * APY from the matching DefiLlama pool) that drives the allocation — no static
 * hardcoded yield table.
 */
const log = childLogger("execution.tool.assets");

const COINGECKO_PRICE = "https://api.coingecko.com/api/v3/simple/price";
const DEFILLAMA_POOLS = "https://yields.llama.fi/pools";

export type AssetSymbol = "MNT" | "mETH" | "USDY";

/** CoinGecko ids and DefiLlama symbol hints per supported asset. */
const ASSET_META: Readonly<
  Record<AssetSymbol, { coingeckoId: string; llamaSymbols: readonly string[]; pegged: boolean }>
> = {
  MNT: { coingeckoId: "mantle", llamaSymbols: ["MNT", "WMNT"], pegged: false },
  mETH: { coingeckoId: "mantle-staked-ether", llamaSymbols: ["METH", "MWETH"], pegged: false },
  USDY: { coingeckoId: "ondo-us-dollar-yield", llamaSymbols: ["USDY"], pegged: true },
};

/** A real market/risk snapshot used to derive a conservative allocation. */
export interface AssetSnapshot {
  readonly symbol: AssetSymbol;
  readonly priceUsd: number;
  readonly change24hPct: number;
  /** Volatility proxy (|24h change|, floored) — higher = riskier. */
  readonly volatilityPct: number;
  readonly apyPct: number;
  readonly pegged: boolean;
  readonly note: string;
}

const CoinGeckoEntry = z.object({
  usd: z.number(),
  usd_24h_change: z.number().optional(),
});
const CoinGeckoResponse = z.record(CoinGeckoEntry);

const LlamaPool = z.object({
  chain: z.string(),
  project: z.string(),
  symbol: z.string(),
  apy: z.number().nullable().optional(),
  apyBase: z.number().nullable().optional(),
  tvlUsd: z.number().nullable().optional(),
});
const LlamaResponse = z.object({
  status: z.string(),
  data: z.array(LlamaPool),
});

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.MARKET_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new UpstreamError(`Market data HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    throw new UpstreamError(
      "Market data request failed",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPrices(
  symbols: readonly AssetSymbol[],
): Promise<z.infer<typeof CoinGeckoResponse>> {
  const ids = symbols.map((s) => ASSET_META[s].coingeckoId).join(",");
  const url = new URL(COINGECKO_PRICE);
  url.search = new URLSearchParams({
    ids,
    vs_currencies: "usd",
    include_24hr_change: "true",
  }).toString();
  const headers = env.COINGECKO_API_KEY
    ? { "x-cg-demo-api-key": env.COINGECKO_API_KEY }
    : {};
  return CoinGeckoResponse.parse(await fetchJson(url.toString(), headers));
}

async function fetchMantleYields(): Promise<z.infer<typeof LlamaPool>[]> {
  const parsed = LlamaResponse.parse(await fetchJson(DEFILLAMA_POOLS));
  return parsed.data.filter((p) => p.chain === "Mantle");
}

/** Highest-APY Mantle pool whose symbol mentions one of the asset's hints. */
function apyForAsset(
  symbol: AssetSymbol,
  pools: readonly z.infer<typeof LlamaPool>[],
): number {
  const hints = ASSET_META[symbol].llamaSymbols;
  let best = 0;
  for (const pool of pools) {
    const upper = pool.symbol.toUpperCase();
    if (hints.some((h) => upper.includes(h))) {
      const apy = pool.apyBase ?? pool.apy ?? 0;
      if (apy > best) best = apy;
    }
  }
  return best;
}

export class AssetDataTool {
  readonly calls: ToolCall[] = [];

  /** Read real prices + Mantle yields and build conservative snapshots. */
  async getAssetSnapshots(symbols: readonly AssetSymbol[]): Promise<AssetSnapshot[]> {
    if (symbols.length === 0) {
      throw new UpstreamError("getAssetSnapshots requires at least one symbol");
    }
    const [prices, pools] = await Promise.all([fetchPrices(symbols), fetchMantleYields()]);

    const snapshots: AssetSnapshot[] = symbols.map((symbol) => {
      const meta = ASSET_META[symbol];
      const price = prices[meta.coingeckoId];
      if (price === undefined) {
        log.warn({ symbol }, "No CoinGecko price for asset; defaulting to neutral snapshot");
      }
      const priceUsd = price?.usd ?? 0;
      const change24hPct = price?.usd_24h_change ?? 0;
      const volatilityPct = Math.max(meta.pegged ? 0.5 : 2, Math.abs(change24hPct));
      const apyPct = apyForAsset(symbol, pools);
      return {
        symbol,
        priceUsd,
        change24hPct,
        volatilityPct,
        apyPct,
        pegged: meta.pegged,
        note: `${symbol}: $${priceUsd.toFixed(4)}, 24h ${change24hPct.toFixed(2)}%, APY ${apyPct.toFixed(2)}%${meta.pegged ? " (pegged)" : ""}.`,
      };
    });

    this.calls.push({
      tool: "assets.getAssetSnapshots",
      input: { symbols: [...symbols], chain: "Mantle" },
      output: snapshots.map((s) => ({
        symbol: s.symbol,
        priceUsd: s.priceUsd,
        apyPct: s.apyPct,
        volatilityPct: s.volatilityPct,
      })),
    });

    return snapshots;
  }
}
