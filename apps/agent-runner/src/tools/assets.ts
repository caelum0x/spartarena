import type { ToolCall } from "./mantle.js";
import {
  COINGECKO_IDS,
  DEFILLAMA_POOLS,
  fetchCoinGeckoPrices,
  fetchAllPools,
  poolApy,
  type CoinGeckoPrices,
  type DefiLlamaPool,
} from "./market-data.js";

/** Supported Mantle-ecosystem assets the YieldStrategist reasons over. */
export type AssetSymbol = "MNT" | "mETH" | "USDY";

/** A single asset's market/risk snapshot used to derive a conservative strategy. */
export interface AssetSnapshot {
  symbol: AssetSymbol;
  /** Indicative annualised yield in percent (0-100), from DefiLlama where available. */
  apyPct: number;
  /** Proxy realised volatility in percent (derived from |24h change| × factor). */
  volatilityPct: number;
  /** Current USD price (from CoinGecko), if available. */
  priceUsd?: number;
  /** Liquidity tier; "deep" is safest, "thin" is riskiest. */
  liquidity: "deep" | "moderate" | "thin";
  /** True for assets pegged to a reference value (e.g. USDY -> USD). */
  pegged: boolean;
  note: string;
}

/** Static per-asset metadata that is not market-derived. */
interface AssetMeta {
  pegged: boolean;
  liquidity: AssetSnapshot["liquidity"];
  /** Annualisation factor applied to |24h change| to proxy 30-day volatility. */
  volFactor: number;
}

const META: Readonly<Record<AssetSymbol, AssetMeta>> = {
  USDY: { pegged: true, liquidity: "deep", volFactor: 2 },
  mETH: { pegged: false, liquidity: "moderate", volFactor: 6 },
  MNT: { pegged: false, liquidity: "deep", volFactor: 8 },
};

/** Deterministic offline snapshots — only used behind ASSETS_OFFLINE=true. */
const OFFLINE_TABLE: Readonly<Record<AssetSymbol, AssetSnapshot>> = {
  USDY: {
    symbol: "USDY",
    apyPct: 5.1,
    volatilityPct: 1.2,
    liquidity: "deep",
    pegged: true,
    note: "Tokenised T-bill (RWA), USD-pegged — lowest volatility anchor (offline).",
  },
  mETH: {
    symbol: "mETH",
    apyPct: 3.8,
    volatilityPct: 22.4,
    liquidity: "moderate",
    pegged: false,
    note: "Liquid-staked ETH; yield-bearing but exposed to ETH price moves (offline).",
  },
  MNT: {
    symbol: "MNT",
    apyPct: 0.0,
    volatilityPct: 41.7,
    liquidity: "deep",
    pegged: false,
    note: "Native gas token; highest volatility of the set, no native yield (offline).",
  },
};

/**
 * Asset-data tool for the YieldStrategist. Reads REAL market data: CoinGecko
 * `/simple/price` (USD price + 24h change → volatility proxy) and DefiLlama
 * `/pools` (canonical APY for USDY/mETH from the named pools). Records a
 * `ToolCall` for every fetch so the calls hash into the decision proof.
 *
 * A deterministic offline path is provided ONLY behind `ASSETS_OFFLINE=true`,
 * for tests/demos without network access.
 */
export class AssetDataTool {
  readonly calls: ToolCall[] = [];
  private readonly offline: boolean;

  constructor(offline = process.env.ASSETS_OFFLINE === "true") {
    this.offline = offline;
  }

  async getAssetSnapshots(symbols: readonly AssetSymbol[]): Promise<AssetSnapshot[]> {
    if (symbols.length === 0) {
      throw new Error("AssetDataTool.getAssetSnapshots requires at least one symbol");
    }

    if (this.offline) {
      return this.offlineSnapshots(symbols);
    }

    const ids = symbols.map((s) => COINGECKO_IDS[s]);
    const [prices, allPools] = await Promise.all([
      fetchCoinGeckoPrices(ids),
      fetchAllPools(),
    ]);
    // Named-pool APYs (USDY on Mantle, mETH staking on Ethereum) are looked up
    // from the full set; the Mantle subset is recorded for transparency.
    const mantlePools = allPools.filter((p) => p.chain === "Mantle");

    this.calls.push({
      tool: "coingecko.simplePrice",
      input: { ids },
      output: prices,
    });
    this.calls.push({
      tool: "defillama.pools",
      input: { chainFilter: "Mantle" },
      output: { total: allPools.length, mantle: mantlePools.length },
    });

    const pools = allPools;

    const snapshots = symbols.map((symbol) => buildSnapshot(symbol, prices, pools));

    this.calls.push({
      tool: "assets.getAssetSnapshots",
      input: { symbols: [...symbols] },
      output: snapshots,
    });

    return snapshots;
  }

  private offlineSnapshots(symbols: readonly AssetSymbol[]): AssetSnapshot[] {
    const snapshots = symbols.map((symbol) => {
      const snapshot = OFFLINE_TABLE[symbol];
      if (!snapshot) {
        throw new Error(`Unknown asset symbol: ${String(symbol)}`);
      }
      return snapshot;
    });
    this.calls.push({
      tool: "assets.getAssetSnapshots",
      input: { symbols: [...symbols], offline: true },
      output: snapshots,
    });
    return snapshots;
  }
}

function buildSnapshot(
  symbol: AssetSymbol,
  prices: CoinGeckoPrices,
  pools: readonly DefiLlamaPool[],
): AssetSnapshot {
  const meta = META[symbol];
  const cg = prices[COINGECKO_IDS[symbol]];
  const priceUsd = cg?.usd;
  const change24h = Math.abs(cg?.usd_24h_change ?? 0);
  // Proxy 30-day volatility from the magnitude of the 24h move. Pegged assets are
  // floored low; risk assets scale by their factor. Bounded to [0.5, 100].
  const rawVol = meta.pegged ? Math.max(change24h, 0.5) : change24h * meta.volFactor;
  const volatilityPct = round1(Math.max(0.5, Math.min(100, rawVol)));

  const apyPct = round2(apyFor(symbol, pools));

  return {
    symbol,
    apyPct,
    volatilityPct,
    priceUsd,
    liquidity: meta.liquidity,
    pegged: meta.pegged,
    note: describe(symbol, apyPct, volatilityPct, priceUsd),
  };
}

function apyFor(symbol: AssetSymbol, pools: readonly DefiLlamaPool[]): number {
  if (symbol === "USDY") {
    return poolApy(pools, DEFILLAMA_POOLS.USDY);
  }
  if (symbol === "mETH") {
    return poolApy(pools, DEFILLAMA_POOLS.mETH);
  }
  return 0; // MNT has no native yield.
}

function describe(
  symbol: AssetSymbol,
  apy: number,
  vol: number,
  price?: number,
): string {
  const priceStr = price !== undefined ? ` ~$${price}` : "";
  switch (symbol) {
    case "USDY":
      return `Tokenised T-bill (RWA), USD-pegged${priceStr}; live APY ${apy}%, vol ${vol}%.`;
    case "mETH":
      return `Liquid-staked ETH${priceStr}; staking APR ${apy}%, vol ${vol}% (ETH-price exposed).`;
    case "MNT":
      return `Native gas token${priceStr}; no native yield, vol ${vol}%.`;
    default:
      return `${symbol}${priceStr}; APY ${apy}%, vol ${vol}%.`;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
