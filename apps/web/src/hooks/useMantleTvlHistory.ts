"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Mantle TVL history hook. Reads the `/api/mantle/tvl` server route (which wraps
 * the public DefiLlama historical-chain-TVL endpoint) and exposes a validated
 * `{ date, tvl }[]` series, oldest → newest.
 */

const TvlPointSchema = z.object({
  date: z.number(),
  tvl: z.number(),
});

const MantleTvlDataSchema = z.object({
  series: z.array(TvlPointSchema),
});

const MantleTvlEnvelopeSchema = z.object({
  success: z.boolean(),
  data: MantleTvlDataSchema.nullable().optional(),
  error: z.string().optional(),
});

export type MantleTvlPoint = z.infer<typeof TvlPointSchema>;

async function fetchMantleTvlHistory(): Promise<MantleTvlPoint[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/mantle/tvl", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = MantleTvlEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Mantle TVL request failed (${res.status})`);
    }
    return parsed.data.series;
  } finally {
    clearTimeout(timer);
  }
}

/** Live Mantle TVL history, refreshed every 10 minutes. */
export function useMantleTvlHistory() {
  return useQuery<MantleTvlPoint[]>({
    queryKey: ["mantle-tvl-history"],
    queryFn: fetchMantleTvlHistory,
    staleTime: 300_000,
    refetchInterval: 600_000,
    retry: 1,
  });
}
