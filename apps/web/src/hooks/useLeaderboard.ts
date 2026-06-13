"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { LeaderboardEntry } from "@/types";

/** Fetches the Hall of Glory leaderboard, ranked by Glory score. */
export function useLeaderboard() {
  return useQuery<Fetched<readonly LeaderboardEntry[]>>({
    queryKey: ["leaderboard"],
    queryFn: () => api.getLeaderboard(),
  });
}
