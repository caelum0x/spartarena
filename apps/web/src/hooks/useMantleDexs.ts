"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Real Mantle DEX trading volumes, aggregated server-side from the public
 * DefiLlama DEX overview feed via `GET /api/mantle/dexs`. The envelope and the
 * payload are validated locally with zod so the UI only ever sees well-formed
 * data. Refetches on a gentle interval so volumes stay reasonably fresh.
 */

const DexSchema = z.object({
  name: z.string(),
  vol24h: z.number().nullable(),
  vol7d: z.number().nullable(),
  change7dOver7d: z.number().nullable(),
});

const DataSchema = z.object({
  total24h: z.number().nullable(),
  total7d: z.number().nullable(),
  dexs: z.array(DexSchema),
});

const EnvelopeSchema = z.object({
  success: z.literal(true),
  data: DataSchema,
});

export type MantleDex = z.infer<typeof DexSchema>;
export type MantleDexsData = z.infer<typeof DataSchema>;

async function fetchMantleDexs(): Promise<MantleDexsData> {
  const res = await fetch("/api/mantle/dexs", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DEX volume request failed (${res.status})`);
  const json = (await res.json()) as unknown;
  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) throw new Error("Malformed DEX volume response");
  return parsed.data.data;
}

export function useMantleDexs() {
  return useQuery<MantleDexsData>({
    queryKey: ["mantle", "dexs"],
    queryFn: fetchMantleDexs,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
