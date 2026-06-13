"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationStatusView } from "@/types";

/**
 * Reads backend notification channel configuration (`GET /notifications/status`).
 *
 * Soft read: resolves to `undefined` on any failure (endpoint unimplemented,
 * unreachable, malformed) so callers can simply hide the indicator. Cached for a
 * minute and never retried aggressively — it's purely informational.
 */
export function useNotificationStatus() {
  return useQuery<NotificationStatusView | undefined>({
    queryKey: ["notification-status"],
    queryFn: () => api.getNotificationStatus(),
    staleTime: 60_000,
    retry: false,
  });
}
