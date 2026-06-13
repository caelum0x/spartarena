"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { formatEther } from "viem";

/**
 * Token price hook. Reads the CoinGecko-driven `/api/prices` server route (which
 * proxies the backend / CoinGecko with the API key kept server-side) and exposes
 * a validated symbol → USD map plus a helper to value MNT wei amounts in USD.
 */

const TokenPriceSchema = z.object({
  usd: z.number(),
  usd24hChange: z.number(),
});

const PriceMapSchema = z.record(TokenPriceSchema);

const PriceEnvelopeSchema = z.object({
  success: z.boolean(),
  data: PriceMapSchema.nullable().optional(),
  error: z.string().optional(),
});

export type PriceMap = z.infer<typeof PriceMapSchema>;

async function fetchPrices(): Promise<PriceMap> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/prices", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = PriceEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Prices request failed (${res.status})`);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Live token prices (USD), refreshed every 60s. */
export function usePrices() {
  return useQuery<PriceMap>({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

/**
 * Returns the USD value of an MNT wei amount given the current MNT price, or
 * undefined when the price is not yet available. Pure helper for components.
 */
export function mntWeiToUsd(
  wei: string | bigint,
  prices: PriceMap | undefined,
): number | undefined {
  const mntUsd = prices?.MNT?.usd;
  if (mntUsd === undefined) return undefined;
  try {
    const mnt = Number(formatEther(typeof wei === "bigint" ? wei : BigInt(wei)));
    return mnt * mntUsd;
  } catch {
    return undefined;
  }
}

/** Formats a USD number as a compact currency string (e.g. "$12.50"). */
export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}
