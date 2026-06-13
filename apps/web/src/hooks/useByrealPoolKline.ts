"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Fetches a single Byreal pool's REAL price-history series from the same-origin
 * `GET /api/byreal/pools/<address>/kline` route, validates the API envelope, and
 * returns the normalized `{ prices, window }` payload. Refetches on a gentle
 * interval so the sparkline stays live. Production data only.
 */

const KlineDataSchema = z.object({
  prices: z.array(z.number()),
  window: z.string(),
});

const KlineEnvelopeSchema = z.object({
  success: z.boolean(),
  data: KlineDataSchema.nullable(),
  error: z.string().nullable().optional(),
});

export type ByrealPoolKline = z.infer<typeof KlineDataSchema>;

async function fetchPoolKline(address: string): Promise<ByrealPoolKline> {
  const res = await fetch(`/api/byreal/pools/${encodeURIComponent(address)}/kline`);
  const json: unknown = await res.json();
  const envelope = KlineEnvelopeSchema.parse(json);

  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.error ?? "Failed to load Byreal price history");
  }

  return envelope.data;
}

/** Fetches the price-history sparkline series for one Byreal pool by address. */
export function useByrealPoolKline(address: string) {
  return useQuery<ByrealPoolKline>({
    queryKey: ["byreal", "pool", address, "kline"],
    queryFn: () => fetchPoolKline(address),
    enabled: address.length > 0,
    retry: false,
    refetchInterval: 60_000,
  });
}
