"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Real Mantle protocol fees and revenue, aggregated server-side from the public
 * DefiLlama fees overview feed via `GET /api/mantle/fees`. The envelope and the
 * payload are validated locally with zod so the UI only ever sees well-formed
 * data. Refetches on a gentle interval so figures stay reasonably fresh.
 */

const FeeProtocolSchema = z.object({
  name: z.string(),
  category: z.string().nullable(),
  fees24h: z.number().nullable(),
  fees7d: z.number().nullable(),
});

const DataSchema = z.object({
  total24h: z.number().nullable(),
  total7d: z.number().nullable(),
  protocols: z.array(FeeProtocolSchema),
});

const EnvelopeSchema = z.object({
  success: z.literal(true),
  data: DataSchema,
});

export type MantleFeeProtocol = z.infer<typeof FeeProtocolSchema>;
export type MantleFeesData = z.infer<typeof DataSchema>;

async function fetchMantleFees(): Promise<MantleFeesData> {
  const res = await fetch("/api/mantle/fees", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Fee data request failed (${res.status})`);
  const json = (await res.json()) as unknown;
  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) throw new Error("Malformed fee data response");
  return parsed.data.data;
}

export function useMantleFees() {
  return useQuery<MantleFeesData>({
    queryKey: ["mantle", "fees"],
    queryFn: fetchMantleFees,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
