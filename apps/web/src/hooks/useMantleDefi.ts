"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Mantle DeFi snapshot hook. Reads the `/api/mantle/defi` server route (which
 * aggregates the public DefiLlama endpoints) and exposes a validated
 * `{ tvlUsd, stablecoinsUsd, tvlChange30dPct, tvlHistory }` object.
 *
 * All monetary fields are nullable: a single failing upstream feed degrades to
 * `null` rather than failing the whole request.
 */

const MantleDefiDataSchema = z.object({
  tvlUsd: z.number().nullable(),
  stablecoinsUsd: z.number().nullable(),
  tvlChange30dPct: z.number().nullable(),
  tvlHistory: z.array(z.number()),
});

const MantleDefiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: MantleDefiDataSchema.nullable().optional(),
  error: z.string().optional(),
});

export type MantleDefiData = z.infer<typeof MantleDefiDataSchema>;

async function fetchMantleDefi(): Promise<MantleDefiData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/mantle/defi", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = MantleDefiEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Mantle DeFi request failed (${res.status})`);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Live Mantle DeFi snapshot, refreshed every 5 minutes. */
export function useMantleDefi() {
  return useQuery<MantleDefiData>({
    queryKey: ["mantle-defi"],
    queryFn: fetchMantleDefi,
    staleTime: 120_000,
    refetchInterval: 300_000,
    retry: 1,
  });
}
