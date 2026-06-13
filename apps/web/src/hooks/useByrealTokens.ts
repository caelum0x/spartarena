"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { ByrealTokenView } from "@/types";

/**
 * Lists the real Byreal (Solana) tokens ranked by the ByrealPoolAnalyst's
 * discovery skill via the same-origin `GET /api/byreal/tokens` route. Production
 * data only — no mock path. Refetches gently so price/volume stay live.
 */
export function useByrealTokens() {
  return useQuery<Fetched<readonly ByrealTokenView[]>>({
    queryKey: ["byreal", "tokens"],
    queryFn: () => api.listByrealTokens(),
    refetchInterval: 60_000,
  });
}

/** Fetches a single analysed Byreal token by its mint address. */
export function useByrealToken(mint: string) {
  return useQuery<ByrealTokenView>({
    queryKey: ["byreal", "token", mint],
    queryFn: () => api.getByrealToken(mint),
    enabled: mint.length > 0,
    refetchInterval: 60_000,
    retry: false,
  });
}
