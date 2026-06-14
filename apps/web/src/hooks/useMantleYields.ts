"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Real Mantle yield opportunities, aggregated server-side from the public
 * DefiLlama yields feed via `GET /api/mantle/yields`. The envelope and the pool
 * array are validated locally with zod so the UI only ever sees well-formed
 * data. Refetches on a gentle interval so APYs stay reasonably fresh.
 */

const PoolSchema = z.object({
  id: z.string(),
  project: z.string(),
  symbol: z.string(),
  tvlUsd: z.number(),
  apy: z.number(),
  apyBase: z.number().nullable(),
  apyReward: z.number().nullable(),
  stablecoin: z.boolean(),
  ilRisk: z.string().nullable(),
  exposure: z.string().nullable(),
  poolMeta: z.string().nullable(),
});

const EnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(PoolSchema),
});

export type MantleYieldPool = z.infer<typeof PoolSchema>;

async function fetchMantleYields(): Promise<readonly MantleYieldPool[]> {
  const res = await fetch("/api/mantle/yields", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Yield request failed (${res.status})`);
  const json = (await res.json()) as unknown;
  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) throw new Error("Malformed yield response");
  return parsed.data.data;
}

export function useMantleYields() {
  return useQuery<readonly MantleYieldPool[]>({
    queryKey: ["mantle", "yields"],
    queryFn: fetchMantleYields,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
