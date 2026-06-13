"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { DecisionView } from "@/types";

/** Lists the global War Chronicle (all recorded decisions). */
export function useDecisions() {
  return useQuery<Fetched<readonly DecisionView[]>>({
    queryKey: ["decisions"],
    queryFn: () => api.listDecisions(),
  });
}

/** Lists the decisions recorded by a single Spartan. */
export function useAgentDecisions(agentId: number) {
  return useQuery<Fetched<readonly DecisionView[]>>({
    queryKey: ["decisions", "agent", agentId],
    queryFn: () => api.getAgentDecisions(agentId),
    enabled: Number.isFinite(agentId),
  });
}

/** Lists the decisions recorded for a single Battle. */
export function useTaskDecisions(taskId: number) {
  return useQuery<Fetched<readonly DecisionView[]>>({
    queryKey: ["decisions", "task", taskId],
    queryFn: () => api.getTaskDecisions(taskId),
    enabled: Number.isFinite(taskId),
  });
}
