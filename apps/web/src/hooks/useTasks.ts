"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Fetched } from "@/lib/api";
import type { TaskView } from "@/types";

/** Lists all Battles (tasks) in the Arena. */
export function useTasks() {
  return useQuery<Fetched<readonly TaskView[]>>({
    queryKey: ["tasks"],
    queryFn: () => api.listTasks(),
  });
}

/** Fetches a single Battle by id. */
export function useTask(taskId: number) {
  return useQuery<Fetched<TaskView | undefined>>({
    queryKey: ["task", taskId],
    queryFn: () => api.getTask(taskId),
    enabled: Number.isFinite(taskId),
  });
}
