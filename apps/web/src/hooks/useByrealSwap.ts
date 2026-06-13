"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ByrealSwapPreview } from "@/types";

export interface SwapPreviewParams {
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly amountIn: string;
  readonly slippageBps: number;
}

/**
 * Fetches a REAL, non-executable Byreal swap quote preview for the given params.
 * Disabled until `params` is non-null (set when the user submits the form), so
 * no quote is requested on every keystroke. Production data only.
 */
export function useByrealSwapPreview(params: SwapPreviewParams | null) {
  return useQuery<ByrealSwapPreview>({
    queryKey: ["byreal", "swap", params],
    queryFn: () => api.previewByrealSwap(params as SwapPreviewParams),
    enabled: params !== null,
    refetchInterval: params !== null ? 20_000 : false,
    retry: false,
  });
}
