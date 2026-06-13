"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { ByrealPoolView } from "@/types";

/**
 * Lists the real Byreal liquidity pools surfaced by the backend `GET /byreal/pools`.
 * On the real path the response is zod-validated in the API client; on the opt-in
 * mock path it serves fixtures. Refetches on a gentle interval so APR/volume stay live.
 */
export function useByrealPools() {
  return useQuery<Fetched<readonly ByrealPoolView[]>>({
    queryKey: ["byreal", "pools"],
    queryFn: () => api.listByrealPools(),
    refetchInterval: 60_000,
  });
}

/** Fetches a single analysed Byreal pool by its address. Production data only. */
export function useByrealPool(address: string) {
  return useQuery<ByrealPoolView>({
    queryKey: ["byreal", "pool", address],
    queryFn: () => api.getByrealPool(address),
    enabled: address.length > 0,
    refetchInterval: 60_000,
    retry: false,
  });
}
