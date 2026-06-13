"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Reads a wallet's REAL Byreal (Solana) LP positions via the same-origin
 * `GET /api/byreal/positions` route. Production data only — no mock path.
 * Read-only: position mutations are Solana-side and out of scope.
 */

/** A single flattened, render-ready Byreal LP position. */
export interface ByrealPositionView {
  positionId: string;
  poolAddress: string | null;
  liquidity: string;
  valueUsd: number | null;
  feesUsd: number | null;
}

/** Local validation of one position row from the API. */
const PositionViewSchema = z.object({
  positionId: z.string(),
  poolAddress: z.string().nullable(),
  liquidity: z.string(),
  valueUsd: z.number().nullable(),
  feesUsd: z.number().nullable(),
});

/** Local validation of the `{ success, data, error }` API envelope. */
const EnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.array(PositionViewSchema).nullable().optional(),
  error: z.string().nullable().optional(),
});

async function fetchPositions(owner: string): Promise<ByrealPositionView[]> {
  const res = await fetch(`/api/byreal/positions?owner=${encodeURIComponent(owner)}`);
  const json: unknown = await res.json().catch(() => null);

  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response from the Byreal positions service.");
  }

  const envelope = parsed.data;
  if (!res.ok || !envelope.success || !envelope.data) {
    throw new Error(
      envelope.error ?? "Failed to load Byreal positions for this wallet.",
    );
  }

  return envelope.data;
}

/**
 * Fetches the REAL Byreal LP positions for a Solana wallet `owner`. Disabled
 * until the address is long enough to be a plausible base58 pubkey.
 */
export function useByrealPositions(owner: string) {
  return useQuery<ByrealPositionView[]>({
    queryKey: ["byreal", "positions", owner],
    queryFn: () => fetchPositions(owner),
    enabled: owner.length >= 32,
    retry: false,
  });
}
