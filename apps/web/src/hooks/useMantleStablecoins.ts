"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Mantle stablecoins hook. Reads the `/api/mantle/stablecoins` server route
 * (which wraps the public DefiLlama stablecoins endpoint) and exposes a
 * validated `{ totalUsd, assets }` object describing stablecoin circulation on
 * Mantle, broken down by asset.
 */

const MantleStablecoinAssetSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  mantleUsd: z.number(),
  pegType: z.string().nullable(),
});

const MantleStablecoinsDataSchema = z.object({
  totalUsd: z.number(),
  assets: z.array(MantleStablecoinAssetSchema),
});

const MantleStablecoinsEnvelopeSchema = z.object({
  success: z.boolean(),
  data: MantleStablecoinsDataSchema.nullable().optional(),
  error: z.string().optional(),
});

export type MantleStablecoinAsset = z.infer<typeof MantleStablecoinAssetSchema>;
export type MantleStablecoinsData = z.infer<typeof MantleStablecoinsDataSchema>;

async function fetchMantleStablecoins(): Promise<MantleStablecoinsData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/mantle/stablecoins", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = MantleStablecoinsEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Mantle stablecoins request failed (${res.status})`);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Live Mantle stablecoins snapshot, refreshed every 5 minutes. */
export function useMantleStablecoins() {
  return useQuery<MantleStablecoinsData>({
    queryKey: ["mantle-stablecoins"],
    queryFn: fetchMantleStablecoins,
    staleTime: 120_000,
    refetchInterval: 300_000,
    retry: 1,
  });
}
