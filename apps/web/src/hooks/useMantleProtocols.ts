"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Real Mantle DeFi protocols, aggregated server-side from the public DefiLlama
 * protocol list via `GET /api/mantle/protocols`. The envelope and the protocol
 * array are validated locally with zod so the UI only ever sees well-formed
 * data. Refetches on a gentle interval so TVL figures stay reasonably fresh.
 */

const ProtocolSchema = z.object({
  name: z.string(),
  slug: z.string().nullable(),
  category: z.string().nullable(),
  mantleTvl: z.number(),
  logo: z.string().nullable(),
  url: z.string().nullable(),
});

const EnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(ProtocolSchema),
});

export type MantleProtocol = z.infer<typeof ProtocolSchema>;

async function fetchMantleProtocols(): Promise<readonly MantleProtocol[]> {
  const res = await fetch("/api/mantle/protocols", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Protocol request failed (${res.status})`);
  const json = (await res.json()) as unknown;
  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) throw new Error("Malformed protocol response");
  return parsed.data.data;
}

export function useMantleProtocols() {
  return useQuery<readonly MantleProtocol[]>({
    queryKey: ["mantle", "protocols"],
    queryFn: fetchMantleProtocols,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}
