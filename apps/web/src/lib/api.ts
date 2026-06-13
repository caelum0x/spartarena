/**
 * Typed client for the `@spartarena/api` backend.
 *
 * The DEFAULT data path is REAL: every call hits the live backend at
 * `NEXT_PUBLIC_API_URL` and validates the `{ success, data, error, meta }`
 * envelope with zod before unwrapping `data`.
 *
 * Behaviour on failure:
 *  - When `NEXT_PUBLIC_USE_MOCKS === 'true'` we serve rich mock fixtures (offline
 *    / demo path only). This is OPT-IN and never the default.
 *  - Otherwise we surface a real `ApiError` (network/timeout/non-OK/bad payload)
 *    so the UI shows an error or empty state instead of fabricating data.
 *
 * Requests use an AbortController timeout and a small bounded retry with
 * exponential backoff for transient (network / 5xx / 429) failures.
 */
import { z } from "zod";
import { env } from "@/config/env";
import type {
  AgentStakingView,
  AgentView,
  ByrealPoolView,
  ByrealSwapPreview,
  ByrealTokenView,
  DecisionView,
  LeaderboardEntry,
  NotificationStatusView,
  ProjectBattleView,
  ProjectBudgetView,
  ProjectChronicleEventView,
  ProjectMatchView,
  ProjectReadinessView,
  ProjectRecommendationView,
  ProjectRiskView,
  ProjectStatusView,
  ProjectView,
  ReputationView,
  TaskView,
} from "@/types";
import {
  AgentStakingSchema,
  AgentViewSchema,
  ByrealPoolSchema,
  ByrealSwapPreviewSchema,
  ByrealTokenSchema,
  DecisionViewSchema,
  LeaderboardEntrySchema,
  NotificationStatusSchema,
  ProjectBattleSchema,
  ProjectBudgetSchema,
  ProjectChronicleEventSchema,
  ProjectMatchSchema,
  ProjectReadinessSchema,
  ProjectRecommendationSchema,
  ProjectRiskSchema,
  ProjectViewSchema,
  ReputationViewSchema,
  TaskViewSchema,
  envelopeSchema,
} from "./schemas";
import {
  findMockAgent,
  findMockTask,
  mockAgentStaking,
  mockAgents,
  mockByrealPools,
  mockDecisions,
  mockDecisionsForAgent,
  mockDecisionsForTask,
  mockLeaderboard,
  mockProjects,
  mockProjectBudget,
  mockProjectChronicle,
  mockProjectMatches,
  mockProjectReadiness,
  mockProjectRecommendations,
  mockProjectRisks,
  mockReputation,
  mockTasks,
} from "./mock";

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

/** Error thrown when a real backend call cannot produce validated data. */
export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Source flag attached to results so the UI can show a "demo data" notice. */
export interface Fetched<T> {
  readonly data: T;
  readonly source: "api" | "mock";
}

export interface CreateProjectInput {
  readonly title: string;
  readonly summary: string;
  readonly sponsorWallet: string;
  readonly treasuryWei: string;
  readonly requiredSkills: readonly string[];
  readonly deadline?: number;
  readonly slug?: string;
}

export interface CreateProjectBattleInput {
  readonly title: string;
  readonly description: string;
  readonly creatorWallet: string;
  readonly rewardWei: string;
  readonly deadline: number;
  readonly requiredSkill?: string;
}

export interface UpdateProjectInput {
  readonly title?: string;
  readonly summary?: string;
  readonly treasuryWei?: string;
  readonly status?: ProjectStatusView;
  readonly requiredSkills?: readonly string[];
  readonly deadline?: number | null;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Transient statuses worth retrying (rate limit + server errors). */
function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Performs a single GET, validates the envelope against `schema`, and returns the
 * unwrapped, validated `data`. Throws {@link ApiError} on any failure.
 *
 * `baseUrl` defaults to the `@spartarena/api` backend (`env.apiUrl`); pass `""`
 * to hit a same-origin Next.js route handler (e.g. `/api/byreal/pools`), which
 * lets that endpoint work on a static/serverless deploy with no live backend.
 */
async function fetchData<T>(
  path: string,
  dataSchema: z.ZodType<T>,
  baseUrl: string = env.apiUrl,
): Promise<T> {
  const envelope = envelopeSchema(dataSchema);
  let lastError: ApiError = new ApiError(`Request to ${path} failed`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        lastError = new ApiError(`API ${res.status} for ${path}`, res.status);
        if (isRetriableStatus(res.status) && attempt < MAX_RETRIES) {
          await sleep(2 ** attempt * 250);
          continue;
        }
        throw lastError;
      }

      const json: unknown = await res.json();
      const parsed = envelope.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(`Malformed API envelope for ${path}`);
      }
      if (!parsed.data.success || parsed.data.data === undefined) {
        throw new ApiError(parsed.data.error ?? `API reported failure for ${path}`);
      }
      return parsed.data.data as T;
    } catch (error: unknown) {
      // AbortError / network errors are retriable; ApiError(4xx, malformed) are not.
      const isApiError = error instanceof ApiError;
      const retriableNetwork = !isApiError && attempt < MAX_RETRIES;
      lastError = isApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : `Network error for ${path}`);
      if (retriableNetwork) {
        await sleep(2 ** attempt * 250);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function postData<T>(
  path: string,
  body: unknown,
  dataSchema: z.ZodType<T>,
  baseUrl = "",
): Promise<T> {
  const envelope = envelopeSchema(dataSchema);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new ApiError(`API ${res.status} for ${path}`, res.status);
    }

    const json: unknown = await res.json();
    const parsed = envelope.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(`Malformed API envelope for ${path}`);
    }
    if (!parsed.data.success || parsed.data.data === undefined) {
      throw new ApiError(parsed.data.error ?? `API reported failure for ${path}`);
    }
    return parsed.data.data as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : `Network error for ${path}`);
  } finally {
    clearTimeout(timer);
  }
}

async function patchData<T>(
  path: string,
  body: unknown,
  dataSchema: z.ZodType<T>,
  baseUrl = "",
): Promise<T> {
  return writeData("PATCH", path, body, dataSchema, baseUrl);
}

async function writeData<T>(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
  dataSchema: z.ZodType<T>,
  baseUrl = "",
): Promise<T> {
  const envelope = envelopeSchema(dataSchema);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new ApiError(`API ${res.status} for ${path}`, res.status);
    }

    const json: unknown = await res.json();
    const parsed = envelope.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(`Malformed API envelope for ${path}`);
    }
    if (!parsed.data.success || parsed.data.data === undefined) {
      throw new ApiError(parsed.data.error ?? `API reported failure for ${path}`);
    }
    return parsed.data.data as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : `Network error for ${path}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves a value from the real backend, or — only when `useMocks` is enabled —
 * falls back to the provided fixture. With mocks off, real errors propagate to
 * react-query so the UI can render an error/empty state.
 */
async function resolve<T>(
  live: () => Promise<T>,
  mockFactory: () => T,
): Promise<Fetched<T>> {
  if (env.useMocks) {
    return { data: mockFactory(), source: "mock" };
  }
  const data = await live();
  return { data, source: "api" };
}

export const api = {
  listAgents(): Promise<Fetched<readonly AgentView[]>> {
    return resolve<readonly AgentView[]>(
      () => fetchData("/agents", z.array(AgentViewSchema)),
      () => mockAgents,
    );
  },

  getAgent(agentId: number): Promise<Fetched<AgentView | undefined>> {
    return resolve<AgentView | undefined>(
      () => fetchData("/agents/" + agentId, AgentViewSchema),
      () => findMockAgent(agentId),
    );
  },

  listTasks(): Promise<Fetched<readonly TaskView[]>> {
    return resolve<readonly TaskView[]>(
      () => fetchData("/tasks", z.array(TaskViewSchema)),
      () => mockTasks,
    );
  },

  listProjects(): Promise<Fetched<readonly ProjectView[]>> {
    return resolve<readonly ProjectView[]>(
      () => fetchData("/projects", z.array(ProjectViewSchema)),
      () => mockProjects,
    );
  },

  getProject(projectId: string): Promise<Fetched<ProjectView | undefined>> {
    return resolve<ProjectView | undefined>(
      () => fetchData(`/projects/${projectId}`, ProjectViewSchema),
      () => mockProjects.find((project) => project.id === projectId || project.slug === projectId),
    );
  },

  getProjectMatches(projectId: string): Promise<Fetched<readonly ProjectMatchView[]>> {
    return resolve<readonly ProjectMatchView[]>(
      () => fetchData(`/projects/${projectId}/matches`, z.array(ProjectMatchSchema)),
      () => mockProjectMatches(projectId),
    );
  },

  getProjectBudget(projectId: string): Promise<Fetched<ProjectBudgetView>> {
    return resolve<ProjectBudgetView>(
      () => fetchData(`/projects/${projectId}/budget`, ProjectBudgetSchema),
      () => mockProjectBudget(projectId),
    );
  },

  getProjectChronicle(projectId: string): Promise<Fetched<readonly ProjectChronicleEventView[]>> {
    return resolve<readonly ProjectChronicleEventView[]>(
      () => fetchData(`/projects/${projectId}/chronicle`, z.array(ProjectChronicleEventSchema)),
      () => mockProjectChronicle(projectId),
    );
  },

  getProjectRecommendations(projectId: string): Promise<Fetched<readonly ProjectRecommendationView[]>> {
    return resolve<readonly ProjectRecommendationView[]>(
      () => fetchData(`/projects/${projectId}/recommendations`, z.array(ProjectRecommendationSchema)),
      () => mockProjectRecommendations(projectId),
    );
  },

  getProjectRisks(projectId: string): Promise<Fetched<readonly ProjectRiskView[]>> {
    return resolve<readonly ProjectRiskView[]>(
      () => fetchData(`/projects/${projectId}/risks`, z.array(ProjectRiskSchema)),
      () => mockProjectRisks(projectId),
    );
  },

  getProjectReadiness(projectId: string): Promise<Fetched<ProjectReadinessView>> {
    return resolve<ProjectReadinessView>(
      () => fetchData(`/projects/${projectId}/readiness`, ProjectReadinessSchema),
      () => mockProjectReadiness(projectId),
    );
  },

  async createProject(input: CreateProjectInput): Promise<ProjectView> {
    if (env.useMocks) {
      const slug =
        input.slug ??
        input.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      return {
        id: `project-${slug || "new"}`,
        slug: slug || "new-project",
        title: input.title,
        summary: input.summary,
        sponsorWallet: input.sponsorWallet,
        treasuryWei: input.treasuryWei,
        status: "PLANNING",
        requiredSkills: input.requiredSkills,
        deadline: input.deadline !== undefined ? String(input.deadline) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        battleCount: 0,
        openBattleCount: 0,
        completedBattleCount: 0,
        progressPct: 0,
        totalRewardWei: "0",
        remainingTreasuryWei: input.treasuryWei,
        riskLevel: "LOW",
        lastActivityAt: new Date().toISOString(),
        battles: [],
      };
    }
    return postData("/api/projects", input, ProjectViewSchema);
  },

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectView> {
    if (env.useMocks) {
      const existing =
        mockProjects.find((project) => project.id === projectId || project.slug === projectId) ??
        mockProjects[0]!;
      return {
        ...existing,
        ...input,
        deadline:
          input.deadline !== undefined
            ? input.deadline === null
              ? null
              : String(input.deadline)
            : existing.deadline,
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
    }
    return patchData(`/api/projects/${encodeURIComponent(projectId)}`, input, ProjectViewSchema);
  },

  async createProjectBattle(
    projectId: string,
    input: CreateProjectBattleInput,
  ): Promise<ProjectBattleView> {
    if (env.useMocks) {
      return {
        id: `battle-${Date.now()}`,
        chainTaskId: null,
        projectId,
        title: input.title,
        description: input.description,
        descriptionHash: "0x",
        requiredSkill: input.requiredSkill ?? null,
        creatorWallet: input.creatorWallet,
        assignedAgentId: null,
        rewardWei: input.rewardWei,
        status: "OPEN",
        statusCode: 0,
        deadline: String(input.deadline),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return postData(`/api/projects/${encodeURIComponent(projectId)}/battles`, input, ProjectBattleSchema);
  },

  getTask(taskId: number): Promise<Fetched<TaskView | undefined>> {
    return resolve<TaskView | undefined>(
      () => fetchData("/tasks/" + taskId, TaskViewSchema),
      () => findMockTask(taskId),
    );
  },

  listDecisions(): Promise<Fetched<readonly DecisionView[]>> {
    return resolve<readonly DecisionView[]>(
      () => fetchData("/decisions", z.array(DecisionViewSchema)),
      () => mockDecisions,
    );
  },

  getAgentDecisions(agentId: number): Promise<Fetched<readonly DecisionView[]>> {
    return resolve<readonly DecisionView[]>(
      () => fetchData(`/agents/${agentId}/decisions`, z.array(DecisionViewSchema)),
      () => mockDecisionsForAgent(agentId),
    );
  },

  getTaskDecisions(taskId: number): Promise<Fetched<readonly DecisionView[]>> {
    return resolve<readonly DecisionView[]>(
      () => fetchData(`/tasks/${taskId}/decisions`, z.array(DecisionViewSchema)),
      () => mockDecisionsForTask(taskId),
    );
  },

  getLeaderboard(): Promise<Fetched<readonly LeaderboardEntry[]>> {
    return resolve<readonly LeaderboardEntry[]>(
      () => fetchData("/leaderboard", z.array(LeaderboardEntrySchema)),
      () => mockLeaderboard(),
    );
  },

  getReputation(agentId: number): Promise<Fetched<ReputationView | undefined>> {
    return resolve<ReputationView | undefined>(
      () => fetchData(`/agents/${agentId}/reputation`, ReputationViewSchema),
      () => mockReputation(agentId),
    );
  },

  listByrealPools(): Promise<Fetched<readonly ByrealPoolView[]>> {
    // Same-origin Next.js route (`/api/byreal/pools`) that reads the REAL Byreal
    // (Solana) REST API server-side, so the pool board works on Vercel with no
    // separate backend and no browser CORS. Pass `""` as the base URL.
    return resolve<readonly ByrealPoolView[]>(
      () => fetchData("/api/byreal/pools", z.array(ByrealPoolSchema), ""),
      () => mockByrealPools,
    );
  },

  /** Single analysed Byreal pool via the same-origin per-address route. */
  getByrealPool(address: string): Promise<ByrealPoolView> {
    return fetchData(`/api/byreal/pools/${encodeURIComponent(address)}`, ByrealPoolSchema, "");
  },

  async listByrealTokens(): Promise<Fetched<readonly ByrealTokenView[]>> {
    // Same-origin Next.js route (`/api/byreal/tokens`) — REAL Byreal (Solana)
    // mint discovery ranked server-side. Production data only: no mock fallback.
    const data = await fetchData("/api/byreal/tokens", z.array(ByrealTokenSchema), "");
    return { data, source: "api" };
  },

  /** Single analysed Byreal token via the same-origin per-mint route. */
  getByrealToken(mint: string): Promise<ByrealTokenView> {
    return fetchData(`/api/byreal/tokens/${encodeURIComponent(mint)}`, ByrealTokenSchema, "");
  },

  /**
   * REAL, non-executable Byreal swap quote preview via `/api/byreal/swap-preview`.
   * `tokenIn`/`tokenOut` are mint addresses; `amountIn` is a decimal token amount.
   * Production data only — no mock fallback.
   */
  previewByrealSwap(input: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps?: number;
  }): Promise<ByrealSwapPreview> {
    const query = new URLSearchParams({
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amountIn: input.amountIn,
      ...(input.slippageBps !== undefined ? { slippageBps: String(input.slippageBps) } : {}),
    });
    return fetchData(`/api/byreal/swap-preview?${query.toString()}`, ByrealSwapPreviewSchema, "");
  },

  getAgentStaking(agentId: number): Promise<Fetched<AgentStakingView>> {
    return resolve<AgentStakingView>(
      () => fetchData(`/agents/${agentId}/staking`, AgentStakingSchema),
      () => mockAgentStaking(agentId),
    );
  },

  /**
   * Notification channel configuration from `GET /notifications/status`.
   *
   * This is a soft, best-effort read used purely to surface an "Alerts" badge:
   * any failure (endpoint unimplemented / 404 / unreachable / malformed) resolves
   * to `undefined` so the UI hides the indicator instead of erroring. With mocks
   * on, reports both channels as configured.
   */
  async getNotificationStatus(): Promise<NotificationStatusView | undefined> {
    if (env.useMocks) {
      return { telegram: true, discord: true };
    }
    try {
      return await fetchData("/notifications/status", NotificationStatusSchema);
    } catch {
      return undefined;
    }
  },
};
