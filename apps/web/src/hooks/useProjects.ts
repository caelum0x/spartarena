"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type {
  ProjectBudgetView,
  ProjectChronicleEventView,
  ProjectMatchView,
  ProjectReadinessView,
  ProjectRecommendationView,
  ProjectRiskView,
  ProjectView,
} from "@/types";

/** Lists sponsor Projects that group related Battles into workstreams. */
export function useProjects() {
  return useQuery<Fetched<readonly ProjectView[]>>({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });
}

/** Fetches a single Project by slug or id. */
export function useProject(projectId: string) {
  return useQuery<Fetched<ProjectView | undefined>>({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
    enabled: projectId.length > 0,
  });
}

/** Ranked Spartans recommended for a Project's required skills. */
export function useProjectMatches(projectId: string) {
  return useQuery<Fetched<readonly ProjectMatchView[]>>({
    queryKey: ["project", projectId, "matches"],
    queryFn: () => api.getProjectMatches(projectId),
    enabled: projectId.length > 0,
  });
}

/** Project treasury allocation and skill coverage budget. */
export function useProjectBudget(projectId: string) {
  return useQuery<Fetched<ProjectBudgetView>>({
    queryKey: ["project", projectId, "budget"],
    queryFn: () => api.getProjectBudget(projectId),
    enabled: projectId.length > 0,
  });
}

/** Project-level proof and Battle activity. */
export function useProjectChronicle(projectId: string) {
  return useQuery<Fetched<readonly ProjectChronicleEventView[]>>({
    queryKey: ["project", projectId, "chronicle"],
    queryFn: () => api.getProjectChronicle(projectId),
    enabled: projectId.length > 0,
  });
}

/** Draft Battles recommended to cover missing Project skills or risk. */
export function useProjectRecommendations(projectId: string) {
  return useQuery<Fetched<readonly ProjectRecommendationView[]>>({
    queryKey: ["project", projectId, "recommendations"],
    queryFn: () => api.getProjectRecommendations(projectId),
    enabled: projectId.length > 0,
  });
}

/** Project risk register derived from deadline, treasury, coverage and execution. */
export function useProjectRisks(projectId: string) {
  return useQuery<Fetched<readonly ProjectRiskView[]>>({
    queryKey: ["project", projectId, "risks"],
    queryFn: () => api.getProjectRisks(projectId),
    enabled: projectId.length > 0,
  });
}

/** Settlement readiness checklist and blockers for sponsor closeout. */
export function useProjectReadiness(projectId: string) {
  return useQuery<Fetched<ProjectReadinessView>>({
    queryKey: ["project", projectId, "readiness"],
    queryFn: () => api.getProjectReadiness(projectId),
    enabled: projectId.length > 0,
  });
}
