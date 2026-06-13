import { z } from "zod";

/**
 * Request/response validation for the Byreal (Solana DEX) module.
 *
 * The Byreal adapter is read/quote-only; these endpoints expose normalized pool
 * and token lists for the Arena UI. Money fields are returned as numbers (USD)
 * after coercion from the upstream string values, with nulls when a pool/token
 * does not report a given metric.
 */

/** Query for GET /byreal/pools. */
export const byrealPoolsQuerySchema = z.object({
  /** Upstream sort field; Byreal supports `tvl`, `volumeUsd24h`, `feeApr24h`. */
  sortField: z.enum(["tvl", "volumeUsd24h", "feeApr24h"]).default("tvl"),
  sortType: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type ByrealPoolsQuery = z.infer<typeof byrealPoolsQuerySchema>;

/** Query for GET /byreal/tokens. */
export const byrealTokensQuerySchema = z.object({
  /** Optional free-text token search (symbol / name / mint). */
  search: z.string().trim().min(1).max(64).optional(),
  sortField: z.enum(["volumeUsd24h", "marketCap"]).default("volumeUsd24h"),
  sortType: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type ByrealTokensQuery = z.infer<typeof byrealTokensQuerySchema>;

/** Normalized pool row returned by GET /byreal/pools. */
export interface ByrealPoolDto {
  readonly poolAddress: string;
  readonly pair: string;
  readonly tvl: number | null;
  readonly apr: number | null;
  readonly volume24h: number | null;
}

/** Normalized token row returned by GET /byreal/tokens. */
export interface ByrealTokenDto {
  readonly mint: string;
  readonly symbol: string;
  readonly name: string;
  readonly priceUsd: number | null;
  readonly volume24h: number | null;
  readonly marketCap: number | null;
  readonly priceChange24hPct: number | null;
}
