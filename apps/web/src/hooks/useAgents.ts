"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { AgentView, ReputationView } from "@/types";

/** Lists all Spartans (agents). Falls back to mock data when the API is down. */
export function useAgents() {
  return useQuery<Fetched<readonly AgentView[]>>({
    queryKey: ["agents"],
    queryFn: () => api.listAgents(),
  });
}

/** Fetches a single Spartan by id. */
export function useAgent(agentId: number) {
  return useQuery<Fetched<AgentView | undefined>>({
    queryKey: ["agent", agentId],
    queryFn: () => api.getAgent(agentId),
    enabled: Number.isFinite(agentId),
  });
}

/** Fetches an agent's reputation (Honor) breakdown. */
export function useReputation(agentId: number) {
  return useQuery<Fetched<ReputationView | undefined>>({
    queryKey: ["reputation", agentId],
    queryFn: () => api.getReputation(agentId),
    enabled: Number.isFinite(agentId),
  });
}
