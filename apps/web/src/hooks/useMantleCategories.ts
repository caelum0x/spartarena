"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

/**
 * Mantle TVL-by-category hook. Reads the `/api/mantle/categories` server route
 * (which wraps the public DefiLlama protocol list) and exposes a validated
 * `{ totalTvl, categories }` object describing how Mantle's total value locked
 * splits across DeFi protocol categories, ranked by TVL.
 */

const MantleCategorySchema = z.object({
  category: z.string(),
  tvl: z.number(),
  count: z.number(),
});

const MantleCategoriesDataSchema = z.object({
  totalTvl: z.number(),
  categories: z.array(MantleCategorySchema),
});

const MantleCategoriesEnvelopeSchema = z.object({
  success: z.boolean(),
  data: MantleCategoriesDataSchema.nullable().optional(),
  error: z.string().optional(),
});

export type MantleCategory = z.infer<typeof MantleCategorySchema>;
export type MantleCategoriesData = z.infer<typeof MantleCategoriesDataSchema>;

async function fetchMantleCategories(): Promise<MantleCategoriesData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/mantle/categories", {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const json: unknown = await res.json();
    const parsed = MantleCategoriesEnvelopeSchema.parse(json);
    if (!res.ok || !parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? `Mantle categories request failed (${res.status})`);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Live Mantle TVL-by-category snapshot, refreshed every 5 minutes. */
export function useMantleCategories() {
  return useQuery<MantleCategoriesData>({
    queryKey: ["mantle-categories"],
    queryFn: fetchMantleCategories,
    staleTime: 120_000,
    refetchInterval: 300_000,
    retry: 1,
  });
}
