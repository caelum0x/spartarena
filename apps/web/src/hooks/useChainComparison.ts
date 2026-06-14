"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Chain-comparison hook. Reads the `/api/mantle/chains` server route (which wraps
 * the public DefiLlama chains list) and exposes a validated snapshot describing
 * where Mantle ranks among all chains by total value locked, alongside a ranked
 * list of the top chains for comparison.
 */

const TopChainSchema = z.object({
  name: z.string(),
  tvl: z.number(),
  isMantle: z.boolean(),
});

const ChainComparisonDataSchema = z.object({
  mantleRank: z.number().nullable(),
  totalChains: z.number(),
  mantleTvl: z.number().nullable(),
  topChains: z.array(TopChainSchema),
});

const ChainComparisonEnvelopeSchema = z.object({
  success: z.boolean(),
  data: ChainComparisonDataSchema.nullable().optional(),
  error: z.string().optional(),
});

export type TopChain = z.infer<typeof TopChainSchema>;
export type ChainComparisonData = z.infer<typeof ChainComparisonDataSchema>;

async function fetchChainComparison(): Promise<ChainComparisonData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/mantle/chains", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = ChainComparisonEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Chain comparison request failed (${res.status})`);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Live chain-ranking snapshot for Mantle, refreshed every 5 minutes. */
export function useChainComparison() {
  return useQuery<ChainComparisonData>({
    queryKey: ["chain-comparison"],
    queryFn: fetchChainComparison,
    staleTime: 120_000,
    refetchInterval: 300_000,
    retry: 1,
  });
}
