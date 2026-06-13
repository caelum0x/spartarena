import {
  ByrealRestClient,
  ByrealRequestError,
  type MintInfo,
  type SimplePoolInfo,
} from "@spartarena/byreal-adapter";
import { UpstreamError } from "../../lib/errors.js";
import { childLogger } from "../../lib/logger.js";
import { env } from "../../env.js";
import type {
  ByrealPoolDto,
  ByrealPoolsQuery,
  ByrealTokenDto,
  ByrealTokensQuery,
} from "./byreal.schema.js";

/**
 * Byreal (Solana DEX) read service.
 *
 * Wraps the REAL {@link ByrealRestClient} (from `@spartarena/byreal-adapter`) and
 * normalizes pool/token rows into compact DTOs for the Arena UI. The upstream
 * returns money values as strings; we coerce to numbers and emit `null` when a
 * metric is missing or unparseable rather than guessing. Upstream failures are
 * surfaced as {@link UpstreamError} (HTTP 502) for the global error handler.
 */
const log = childLogger("byreal");

/** Lazily-constructed singleton client (uses BYREAL_API_URL / default base). */
let client: ByrealRestClient | undefined;
function getClient(): ByrealRestClient {
  if (!client) {
    client = new ByrealRestClient({
      baseUrl: env.BYREAL_API_URL,
      timeoutMs: env.MARKET_TIMEOUT_MS,
    });
  }
  return client;
}

/** Coerce a Byreal money string to a finite number, or null when absent/invalid. */
function toNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Build a human-readable pair label from a pool's mint metadata. */
function pairLabel(pool: SimplePoolInfo): string {
  const a = pool.mintASymbol ?? shortAddr(pool.mintA);
  const b = pool.mintBSymbol ?? shortAddr(pool.mintB);
  if (a && b) return `${a}/${b}`;
  return a ?? b ?? pool.poolAddress;
}

/** Abbreviate a chain address for display when no symbol is available. */
function shortAddr(addr: string | undefined): string | undefined {
  if (!addr) return undefined;
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

function toPoolDto(pool: SimplePoolInfo): ByrealPoolDto {
  return {
    poolAddress: pool.poolAddress,
    pair: pairLabel(pool),
    tvl: toNumber(pool.tvl),
    apr: toNumber(pool.feeApr24h),
    volume24h: toNumber(pool.volumeUsd24h),
  };
}

function toTokenDto(mint: MintInfo): ByrealTokenDto {
  return {
    mint: mint.address,
    symbol: mint.symbol,
    name: mint.name,
    priceUsd: toNumber(mint.price),
    volume24h: toNumber(mint.volumeUsd24h),
    marketCap: toNumber(mint.marketCap),
    priceChange24hPct: toNumber(mint.priceChange24h),
  };
}

/** Map any Byreal client failure to an UpstreamError, logging detail server-side. */
async function guard<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.error({ err, label }, "Byreal request failed");
    const detail =
      err instanceof ByrealRequestError ? err.message : "upstream error";
    throw new UpstreamError(`Byreal ${label} failed`, { detail });
  }
}

export const byrealService = {
  /** Normalized pool list (TVL / APR / 24h volume) for the Arena. */
  async pools(query: ByrealPoolsQuery): Promise<ByrealPoolDto[]> {
    const pools = await guard("pools", () =>
      getClient().listPools({
        sortField: query.sortField,
        sortType: query.sortType,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
    return pools.map(toPoolDto);
  },

  /** Normalized token/mint discovery list. */
  async tokens(query: ByrealTokensQuery): Promise<ByrealTokenDto[]> {
    const mints = await guard("tokens", () =>
      getClient().listMints({
        ...(query.search ? { searchKey: query.search } : {}),
        sortField: query.sortField,
        sortType: query.sortType,
        page: query.page,
        pageSize: query.pageSize,
      }),
    );
    return mints.map(toTokenDto);
  },
};
