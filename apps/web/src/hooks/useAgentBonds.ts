"use client";

import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgentStakingView } from "@/types";

export interface AgentBond {
  /** Posted bond, in wei (base-10 string). Defaults to "0" while loading/unavailable. */
  readonly bond: string;
  readonly isActive: boolean;
  /** False when the AgentStaking contract isn't configured on the backend. */
  readonly available: boolean;
}

const EMPTY_BOND: AgentBond = { bond: "0", isActive: false, available: false };

/**
 * Fetches each Spartan's War Chest (bond) from `GET /agents/:id/staking` and
 * returns a stable map keyed by agentId. One query per agent so react-query can
 * cache/dedupe; failures degrade to a zero bond rather than breaking the table.
 */
export function useAgentBonds(agentIds: readonly number[]): {
  readonly bonds: ReadonlyMap<number, AgentBond>;
  readonly isLoading: boolean;
} {
  const results = useQueries({
    queries: agentIds.map((agentId) => ({
      queryKey: ["staking", "agent", agentId] as const,
      queryFn: () => api.getAgentStaking(agentId),
      staleTime: 30_000,
    })),
  });

  const bonds = new Map<number, AgentBond>();
  agentIds.forEach((agentId, index) => {
    const view: AgentStakingView | undefined = results[index]?.data?.data;
    bonds.set(
      agentId,
      view
        ? { bond: view.bond, isActive: view.isActive, available: view.available }
        : EMPTY_BOND,
    );
  });

  const isLoading = results.some((r) => r.isLoading);
  return { bonds, isLoading };
}
