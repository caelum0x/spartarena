import type { Agent, Decision, Project, Task } from "@prisma/client";
import { NotFoundError } from "../../lib/errors.js";
import { buildMeta, type PaginationArgs } from "../../lib/pagination.js";
import type { ApiMeta } from "../../lib/errors.js";
import { slugify, withSuffix } from "../../lib/slug.js";
import { toTaskDto, type TaskDto } from "../tasks/tasks.service.js";
import { agentsRepository } from "../agents/agents.repository.js";
import { decisionsRepository } from "../decisions/decisions.repository.js";
import { reputationRepository } from "../reputation/reputation.repository.js";
import { projectsRepository, type ProjectFilter, type ProjectWithTasks } from "./projects.repository.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schema.js";

export interface ProjectDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly sponsorWallet: string;
  readonly treasuryWei: string;
  readonly status: string;
  readonly requiredSkills: readonly string[];
  readonly deadline: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly battleCount: number;
  readonly openBattleCount: number;
  readonly completedBattleCount: number;
  readonly progressPct: number;
  readonly totalRewardWei: string;
  readonly remainingTreasuryWei: string;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH";
  readonly lastActivityAt: string;
  readonly battles: readonly TaskDto[];
}

export interface ProjectMatchDto {
  readonly agentId: string;
  readonly chainAgentId: number | null;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly agentWallet: string;
  readonly skills: readonly string[];
  readonly matchedSkills: readonly string[];
  readonly missingSkills: readonly string[];
  readonly skillMatchPct: number;
  readonly reputationScore: number;
  readonly completedBattles: number;
  readonly matchScore: number;
  readonly reason: string;
}

export interface ProjectRecommendationDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requiredSkill: string | null;
  readonly rewardWei: string;
  readonly deadlineDays: number;
  readonly priority: "LOW" | "MEDIUM" | "HIGH";
  readonly rationale: string;
}

export interface ProjectChronicleEventDto {
  readonly id: string;
  readonly type: "PROJECT_CREATED" | "BATTLE_CREATED" | "BATTLE_STATUS" | "DECISION_RECORDED";
  readonly title: string;
  readonly description: string;
  readonly battleId: string | null;
  readonly battleTitle: string | null;
  readonly chainTaskId: number | null;
  readonly decisionId: string | null;
  readonly chainDecisionId: number | null;
  readonly actionType: string | null;
  readonly confidence: number | null;
  readonly riskScore: number | null;
  readonly txHash: string | null;
  readonly timestamp: string;
}

export interface ProjectBudgetStatusDto {
  readonly status: string;
  readonly battleCount: number;
  readonly rewardWei: string;
}

export interface ProjectBudgetSkillDto {
  readonly skill: string;
  readonly battleCount: number;
  readonly rewardWei: string;
  readonly covered: boolean;
}

export interface ProjectBudgetDto {
  readonly projectId: string;
  readonly treasuryWei: string;
  readonly allocatedWei: string;
  readonly remainingWei: string;
  readonly openWei: string;
  readonly activeWei: string;
  readonly completedWei: string;
  readonly coveragePct: number;
  readonly runwayBattleCount: number;
  readonly oversubscribed: boolean;
  readonly statusBreakdown: readonly ProjectBudgetStatusDto[];
  readonly skillBreakdown: readonly ProjectBudgetSkillDto[];
}

export interface ProjectRiskDto {
  readonly id: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH";
  readonly category: "DEADLINE" | "TREASURY" | "COVERAGE" | "EXECUTION" | "SETTLEMENT";
  readonly title: string;
  readonly description: string;
  readonly suggestedAction: string;
  readonly actionType:
    | "ADD_BATTLE"
    | "UPDATE_PROJECT"
    | "FIND_SPARTANS"
    | "REVIEW_CHRONICLE"
    | "VERIFY_BATTLE";
  readonly requiredSkill: string | null;
  readonly battleId: string | null;
  readonly chainTaskId: number | null;
  readonly detectedAt: string;
}

export interface ProjectReadinessCheckDto {
  readonly id: string;
  readonly label: string;
  readonly complete: boolean;
  readonly detail: string;
}

export interface ProjectReadinessBlockerDto {
  readonly id: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH";
  readonly label: string;
  readonly detail: string;
  readonly actionType: ProjectRiskDto["actionType"];
  readonly requiredSkill: string | null;
  readonly chainTaskId: number | null;
}

export interface ProjectReadinessDto {
  readonly projectId: string;
  readonly scorePct: number;
  readonly readyToSettle: boolean;
  readonly readyToArchive: boolean;
  readonly summary: string;
  readonly nextAction: string;
  readonly completedBattleCount: number;
  readonly unsettledBattleCount: number;
  readonly blockers: readonly ProjectReadinessBlockerDto[];
  readonly checklist: readonly ProjectReadinessCheckDto[];
}

const DEFAULT_REWARD_WEI = 2_000_000_000_000_000_000n;
const MIN_REWARD_WEI = 1_000_000_000_000_000_000n;
const MAX_REWARD_WEI = 5_000_000_000_000_000_000n;

const SKILL_TEMPLATES: Readonly<Record<string, { readonly title: string; readonly description: string }>> = {
  ALPHA_DETECTION: {
    title: "Detect Mantle capital-flow anomalies",
    description:
      "Review recent Mantle wallet, pool and bridge movements. Return unusual accumulation, distribution or routing patterns with confidence, risk score and source links.",
  },
  RWA_STRATEGY: {
    title: "Draft a risk-balanced RWA allocation note",
    description:
      "Compare available RWA and stable-yield venues for the Project objective. Return an allocation proposal, risk limits, liquidity constraints and conditions for pausing deployment.",
  },
  BYREAL_POOL_ANALYSIS: {
    title: "Analyze Byreal pool depth and fee quality",
    description:
      "Evaluate the target Byreal pools for TVL, volume, fee APR, utilization and concentration risk. Return ranked pools with proof hashes and position-size guidance.",
  },
  BYREAL_SWAP_PREVIEW: {
    title: "Preview Byreal swap routes for sponsor flows",
    description:
      "Preview expected swap paths, price impact and slippage limits for sponsor-sized trades. Return the safest route, rejected alternatives and execution constraints.",
  },
  CONTRACT_AUDIT: {
    title: "Audit Project contracts for settlement risk",
    description:
      "Review the Project's relevant contracts, permissions and upgrade paths. Return high-impact findings, exploitability, remediation steps and confidence.",
  },
  GAS_OPTIMIZATION: {
    title: "Find gas reductions in Project execution paths",
    description:
      "Inspect the Project's hot transaction paths and propose gas reductions with estimated savings, tradeoffs and implementation notes.",
  },
};

function sumWei(tasks: readonly Task[]): string {
  return tasks.reduce((acc, task) => acc + BigInt(task.rewardAmount), 0n).toString();
}

function latestActivity(project: Project, tasks: readonly Task[]): string {
  const latest = tasks.reduce(
    (max, task) => (task.updatedAt > max ? task.updatedAt : max),
    project.updatedAt,
  );
  return latest.toISOString();
}

function remainingTreasury(project: Project, tasks: readonly Task[]): string {
  const treasury = BigInt(project.treasuryWei);
  const allocated = BigInt(sumWei(tasks));
  return treasury > allocated ? (treasury - allocated).toString() : "0";
}

function progressPct(tasks: readonly Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((task) => task.status === "VERIFIED" || task.status === "PAID");
  return Math.round((completed.length / tasks.length) * 100);
}

function riskLevel(project: Project, tasks: readonly Task[]): "LOW" | "MEDIUM" | "HIGH" {
  const openCount = tasks.filter((task) => task.status === "OPEN").length;
  const remaining = BigInt(remainingTreasury(project, tasks));
  const deadlineSoon =
    project.deadline !== null
      ? Number(project.deadline) - Math.floor(Date.now() / 1000) < 3 * 86_400
      : false;
  if (project.status === "ARCHIVED" || project.status === "SETTLED") return "LOW";
  if (deadlineSoon && openCount > 0) return "HIGH";
  if (remaining === 0n && tasks.length > 0) return "HIGH";
  if (openCount > 0 || progressPct(tasks) < 50) return "MEDIUM";
  return "LOW";
}

export function toProjectDto(project: ProjectWithTasks): ProjectDto {
  const completed = project.tasks.filter((task) => task.status === "VERIFIED" || task.status === "PAID");
  const progress = progressPct(project.tasks);
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    sponsorWallet: project.sponsorWallet,
    treasuryWei: project.treasuryWei,
    status: project.status,
    requiredSkills: project.requiredSkills,
    deadline: project.deadline !== null ? project.deadline.toString() : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    battleCount: project.tasks.length,
    openBattleCount: project.tasks.filter((task) => task.status === "OPEN").length,
    completedBattleCount: completed.length,
    progressPct: progress,
    totalRewardWei: sumWei(project.tasks),
    remainingTreasuryWei: remainingTreasury(project, project.tasks),
    riskLevel: riskLevel(project, project.tasks),
    lastActivityAt: latestActivity(project, project.tasks),
    battles: project.tasks.map(toTaskDto),
  };
}

export const projectsService = {
  async list(
    filter: ProjectFilter,
    page: PaginationArgs,
  ): Promise<{ items: ProjectDto[]; meta: ApiMeta }> {
    const { rows, total } = await projectsRepository.list(filter, page);
    return { items: rows.map(toProjectDto), meta: buildMeta(total, page) };
  },

  async getByIdentifier(identifier: string): Promise<ProjectDto> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    return toProjectDto(project);
  },

  async create(input: CreateProjectInput): Promise<ProjectDto> {
    const baseSlug = input.slug ?? slugify(input.title);
    const existing = await projectsRepository.findBySlug(baseSlug);
    const slug = existing ? withSuffix(baseSlug) : baseSlug;
    const created = await projectsRepository.create({
      title: input.title,
      summary: input.summary,
      sponsorWallet: input.sponsorWallet.toLowerCase(),
      treasuryWei: input.treasuryWei,
      requiredSkills: input.requiredSkills,
      slug,
      ...(input.deadline !== undefined ? { deadline: BigInt(input.deadline) } : {}),
    });
    return toProjectDto(created);
  },

  async update(identifier: string, input: UpdateProjectInput): Promise<ProjectDto> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    const updated = await projectsRepository.update(project.id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.treasuryWei !== undefined ? { treasuryWei: input.treasuryWei } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.requiredSkills !== undefined ? { requiredSkills: input.requiredSkills } : {}),
      ...(input.deadline !== undefined
        ? { deadline: input.deadline === null ? null : BigInt(input.deadline) }
        : {}),
    });
    return toProjectDto(updated);
  },

  async matches(identifier: string): Promise<ProjectMatchDto[]> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    const { rows: agents } = await agentsRepository.list(
      { status: "ACTIVE" },
      { skip: 0, take: 100, page: 1, limit: 100 },
    );
    const matches = await Promise.all(agents.map((agent) => buildMatch(project, agent)));
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);
  },

  async recommendations(identifier: string): Promise<ProjectRecommendationDto[]> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    return buildRecommendations(project);
  },

  async chronicle(identifier: string): Promise<ProjectChronicleEventDto[]> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    const decisions = await decisionsRepository.listForTaskIds(project.tasks.map((task) => task.id));
    return buildChronicle(project, decisions);
  },

  async budget(identifier: string): Promise<ProjectBudgetDto> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    return buildBudget(project);
  },

  async risks(identifier: string): Promise<ProjectRiskDto[]> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    return buildRisks(project);
  },

  async readiness(identifier: string): Promise<ProjectReadinessDto> {
    const project = await resolveProject(identifier);
    if (!project) throw new NotFoundError("Project");
    return buildReadiness(project);
  },
};

function buildReadiness(project: ProjectWithTasks): ProjectReadinessDto {
  const budget = buildBudget(project);
  const risks = buildRisks(project);
  const highRisks = risks.filter((risk) => risk.severity === "HIGH");
  const mediumRisks = risks.filter((risk) => risk.severity === "MEDIUM");
  const completedBattleCount = project.tasks.filter(
    (task) => task.status === "VERIFIED" || task.status === "PAID",
  ).length;
  const unsettled = project.tasks.filter(
    (task) => task.status !== "VERIFIED" && task.status !== "PAID" && task.status !== "CANCELLED",
  );
  const paidOrVerified = project.tasks.filter((task) => task.status === "VERIFIED" || task.status === "PAID");
  const checklist: ProjectReadinessCheckDto[] = [
    {
      id: "has-battles",
      label: "Battle scope exists",
      complete: project.tasks.length > 0,
      detail:
        project.tasks.length > 0
          ? `${project.tasks.length} Battle(s) are attached to this Project.`
          : "Post at least one Battle before settlement.",
    },
    {
      id: "all-battles-finished",
      label: "No active Battle work remains",
      complete: unsettled.length === 0 && project.tasks.length > 0,
      detail:
        unsettled.length === 0
          ? "All Battles are verified, paid or cancelled."
          : `${unsettled.length} Battle(s) still need assignment, execution or verification.`,
    },
    {
      id: "skill-coverage",
      label: "Required skills covered",
      complete: budget.coveragePct === 100,
      detail: `${budget.coveragePct}% of required skills have active Battle coverage.`,
    },
    {
      id: "no-high-risks",
      label: "High risks cleared",
      complete: highRisks.length === 0,
      detail:
        highRisks.length === 0
          ? "No high-severity Project risks are currently detected."
          : `${highRisks.length} high-severity risk(s) remain.`,
    },
    {
      id: "treasury-balanced",
      label: "Treasury is balanced",
      complete: !budget.oversubscribed,
      detail: budget.oversubscribed
        ? "Allocated Battle rewards exceed the Project treasury intent."
        : "Allocated Battle rewards are within treasury intent.",
    },
    {
      id: "proofs-exist",
      label: "Proof-bearing work exists",
      complete: paidOrVerified.length > 0,
      detail:
        paidOrVerified.length > 0
          ? `${paidOrVerified.length} Battle(s) are verified or paid.`
          : "No verified or paid Battle proofs are attached yet.",
    },
  ];

  const completeCount = checklist.filter((item) => item.complete).length;
  const scorePct = Math.round((completeCount / checklist.length) * 100);
  const readyToSettle =
    project.status !== "ARCHIVED" &&
    project.tasks.length > 0 &&
    unsettled.length === 0 &&
    highRisks.length === 0 &&
    budget.coveragePct === 100 &&
    !budget.oversubscribed;
  const readyToArchive =
    project.status === "SETTLED" &&
    readyToSettle &&
    mediumRisks.length === 0;
  const blockers = buildReadinessBlockers(risks, checklist);

  return {
    projectId: project.id,
    scorePct,
    readyToSettle,
    readyToArchive,
    summary: readinessSummary(project, scorePct, readyToSettle, readyToArchive, blockers.length),
    nextAction: readinessNextAction(readyToSettle, readyToArchive, blockers),
    completedBattleCount,
    unsettledBattleCount: unsettled.length,
    blockers,
    checklist,
  };
}

function buildReadinessBlockers(
  risks: readonly ProjectRiskDto[],
  checklist: readonly ProjectReadinessCheckDto[],
): ProjectReadinessBlockerDto[] {
  const riskBlockers = risks.slice(0, 6).map((risk): ProjectReadinessBlockerDto => ({
    id: risk.id,
    severity: risk.severity,
    label: risk.title,
    detail: risk.suggestedAction,
    actionType: risk.actionType,
    requiredSkill: risk.requiredSkill,
    chainTaskId: risk.chainTaskId,
  }));
  const checklistBlockers = checklist
    .filter((item) => !item.complete)
    .slice(0, 3)
    .map((item): ProjectReadinessBlockerDto => ({
      id: `check:${item.id}`,
      severity: item.id === "all-battles-finished" || item.id === "has-battles" ? "HIGH" : "MEDIUM",
      label: item.label,
      detail: item.detail,
      actionType: item.id === "has-battles" || item.id === "skill-coverage" ? "ADD_BATTLE" : "UPDATE_PROJECT",
      requiredSkill: null,
      chainTaskId: null,
    }));
  const seen = new Set<string>();
  return [...riskBlockers, ...checklistBlockers].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function readinessSummary(
  project: Project,
  scorePct: number,
  readyToSettle: boolean,
  readyToArchive: boolean,
  blockerCount: number,
): string {
  if (readyToArchive) return "Project is ready to archive after settlement review.";
  if (readyToSettle) return "Project is ready to move into settlement.";
  if (project.status === "ARCHIVED") return "Project is archived.";
  return `${scorePct}% ready with ${blockerCount} blocker(s) to clear.`;
}

function readinessNextAction(
  readyToSettle: boolean,
  readyToArchive: boolean,
  blockers: readonly ProjectReadinessBlockerDto[],
): string {
  if (readyToArchive) return "Archive the Project when sponsor review is complete.";
  if (readyToSettle) return "Set Project status to SETTLED in operations.";
  return blockers[0]?.detail ?? "Continue Battle execution and proof review.";
}

function buildRisks(project: ProjectWithTasks): ProjectRiskDto[] {
  const now = Math.floor(Date.now() / 1000);
  const detectedAt = new Date().toISOString();
  const budget = buildBudget(project);
  const risks: ProjectRiskDto[] = [];
  const deadlineSeconds = project.deadline !== null ? Number(project.deadline) : null;
  const secondsToDeadline = deadlineSeconds !== null ? deadlineSeconds - now : null;
  const unfinished = project.tasks.filter((task) => task.status !== "VERIFIED" && task.status !== "PAID");
  const openTasks = project.tasks.filter((task) => task.status === "OPEN");
  const submittedTasks = project.tasks.filter((task) => task.status === "SUBMITTED");

  if (project.status === "ACTIVE" && deadlineSeconds === null) {
    risks.push({
      id: `${project.id}:deadline:none`,
      severity: "MEDIUM",
      category: "DEADLINE",
      title: "No Project deadline",
      description: "Active Projects need a deadline so Battle urgency and sponsor review cadence are clear.",
      suggestedAction: "Set a Project deadline in operations.",
      actionType: "UPDATE_PROJECT",
      requiredSkill: null,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  if (secondsToDeadline !== null && secondsToDeadline < 0 && unfinished.length > 0) {
    risks.push({
      id: `${project.id}:deadline:missed`,
      severity: "HIGH",
      category: "DEADLINE",
      title: "Deadline passed with unfinished Battles",
      description: `${unfinished.length} Battle(s) are not verified or paid after the Project deadline.`,
      suggestedAction: "Review Project scope and move unfinished work to a follow-up Battle or extend the deadline.",
      actionType: "UPDATE_PROJECT",
      requiredSkill: null,
      battleId: unfinished[0]?.id ?? null,
      chainTaskId: unfinished[0]?.chainTaskId ?? null,
      detectedAt,
    });
  } else if (secondsToDeadline !== null && secondsToDeadline < 3 * 86_400 && unfinished.length > 0) {
    risks.push({
      id: `${project.id}:deadline:soon`,
      severity: "HIGH",
      category: "DEADLINE",
      title: "Deadline pressure",
      description: `${unfinished.length} unfinished Battle(s) remain with less than three days before deadline.`,
      suggestedAction: "Prioritize assignment, verification, or deadline adjustment.",
      actionType: "FIND_SPARTANS",
      requiredSkill: null,
      battleId: unfinished[0]?.id ?? null,
      chainTaskId: unfinished[0]?.chainTaskId ?? null,
      detectedAt,
    });
  }

  if (budget.oversubscribed) {
    risks.push({
      id: `${project.id}:treasury:oversubscribed`,
      severity: "HIGH",
      category: "TREASURY",
      title: "Rewards exceed treasury intent",
      description: "Allocated Battle rewards are greater than the Project treasury budget.",
      suggestedAction: "Increase treasury intent or reduce future Battle reward sizes.",
      actionType: "UPDATE_PROJECT",
      requiredSkill: null,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  } else if (budget.remainingWei === "0" && project.status === "ACTIVE" && unfinished.length > 0) {
    risks.push({
      id: `${project.id}:treasury:depleted`,
      severity: "HIGH",
      category: "TREASURY",
      title: "No remaining Project budget",
      description: "The Project has unfinished Battles but no remaining budget for follow-up work.",
      suggestedAction: "Increase treasury intent before posting more Battles.",
      actionType: "UPDATE_PROJECT",
      requiredSkill: null,
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  } else if (budget.runwayBattleCount <= 1 && project.status === "ACTIVE" && budget.remainingWei !== "0") {
    risks.push({
      id: `${project.id}:treasury:low-runway`,
      severity: "MEDIUM",
      category: "TREASURY",
      title: "Low reward runway",
      description: "Remaining treasury covers at most one average-sized follow-up Battle.",
      suggestedAction: "Reserve remaining budget for the highest-priority coverage gap.",
      actionType: "ADD_BATTLE",
      requiredSkill: firstMissingSkill(project),
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  for (const skill of project.requiredSkills) {
    const covered = project.tasks.some(
      (task) => task.status !== "CANCELLED" && task.requiredSkill === skill,
    );
    if (!covered) {
      risks.push({
        id: `${project.id}:coverage:${skill}`,
        severity: project.status === "ACTIVE" ? "HIGH" : "MEDIUM",
        category: "COVERAGE",
        title: `${skill} has no Battle coverage`,
        description: "A required Project skill has no active Battle attached to it.",
        suggestedAction: "Draft a Battle for this required skill.",
        actionType: "ADD_BATTLE",
        requiredSkill: skill,
        battleId: null,
        chainTaskId: null,
        detectedAt,
      });
    }
  }

  if (project.tasks.length === 0) {
    risks.push({
      id: `${project.id}:execution:no-battles`,
      severity: project.status === "ACTIVE" ? "HIGH" : "MEDIUM",
      category: "EXECUTION",
      title: "Project has no Battles",
      description: "The sponsor workstream has no executable Battle scope yet.",
      suggestedAction: "Post the first Battle for this Project.",
      actionType: "ADD_BATTLE",
      requiredSkill: firstMissingSkill(project),
      battleId: null,
      chainTaskId: null,
      detectedAt,
    });
  }

  const staleOpen = openTasks.find((task) => now - Math.floor(task.createdAt.getTime() / 1000) > 2 * 86_400);
  if (staleOpen) {
    risks.push({
      id: `${project.id}:execution:stale-open:${staleOpen.id}`,
      severity: "MEDIUM",
      category: "EXECUTION",
      title: "Open Battle is waiting for assignment",
      description: `${staleOpen.title} has been open for more than two days.`,
      suggestedAction: "Find a qualified Spartan or revise Battle scope.",
      actionType: "FIND_SPARTANS",
      requiredSkill: staleOpen.requiredSkill,
      battleId: staleOpen.id,
      chainTaskId: staleOpen.chainTaskId,
      detectedAt,
    });
  }

  const submitted = submittedTasks[0];
  if (submitted) {
    risks.push({
      id: `${project.id}:settlement:submitted:${submitted.id}`,
      severity: "MEDIUM",
      category: "SETTLEMENT",
      title: "Submitted Battle awaits verification",
      description: `${submitted.title} has submitted output that should be verified or sent back for follow-up.`,
      suggestedAction: "Review the decision proof and verify the Battle when ready.",
      actionType: "VERIFY_BATTLE",
      requiredSkill: submitted.requiredSkill,
      battleId: submitted.id,
      chainTaskId: submitted.chainTaskId,
      detectedAt,
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 12);
}

function firstMissingSkill(project: ProjectWithTasks): string | null {
  return (
    project.requiredSkills.find(
      (skill) =>
        !project.tasks.some((task) => task.status !== "CANCELLED" && task.requiredSkill === skill),
    ) ?? null
  );
}

function severityRank(severity: ProjectRiskDto["severity"]): number {
  if (severity === "HIGH") return 3;
  if (severity === "MEDIUM") return 2;
  return 1;
}

function buildBudget(project: ProjectWithTasks): ProjectBudgetDto {
  const treasury = BigInt(project.treasuryWei);
  const allocated = BigInt(sumWei(project.tasks));
  const remaining = treasury > allocated ? treasury - allocated : 0n;
  const openWei = sumStatusWei(project.tasks, ["OPEN"]);
  const activeWei = sumStatusWei(project.tasks, ["ACCEPTED", "SUBMITTED"]);
  const completedWei = sumStatusWei(project.tasks, ["VERIFIED", "PAID"]);
  const coveredSkills = new Set(
    project.tasks
      .filter((task) => task.status !== "CANCELLED" && task.requiredSkill !== null)
      .map((task) => task.requiredSkill as string),
  );
  const coveragePct =
    project.requiredSkills.length === 0
      ? 100
      : Math.round((coveredSkills.size / project.requiredSkills.length) * 100);
  const averageReward =
    project.tasks.length > 0 ? allocated / BigInt(project.tasks.length) : DEFAULT_REWARD_WEI;
  const runwayBattleCount =
    averageReward > 0n ? Number(remaining / averageReward > 99n ? 99n : remaining / averageReward) : 0;

  return {
    projectId: project.id,
    treasuryWei: project.treasuryWei,
    allocatedWei: allocated.toString(),
    remainingWei: remaining.toString(),
    openWei: openWei.toString(),
    activeWei: activeWei.toString(),
    completedWei: completedWei.toString(),
    coveragePct,
    runwayBattleCount,
    oversubscribed: allocated > treasury,
    statusBreakdown: buildStatusBreakdown(project.tasks),
    skillBreakdown: buildSkillBreakdown(project),
  };
}

function sumStatusWei(tasks: readonly Task[], statuses: readonly string[]): bigint {
  const allowed = new Set(statuses);
  return tasks
    .filter((task) => allowed.has(task.status))
    .reduce((sum, task) => sum + BigInt(task.rewardAmount), 0n);
}

function buildStatusBreakdown(tasks: readonly Task[]): ProjectBudgetStatusDto[] {
  const statuses = ["OPEN", "ACCEPTED", "SUBMITTED", "VERIFIED", "PAID", "CANCELLED"];
  return statuses.map((status) => {
    const rows = tasks.filter((task) => task.status === status);
    return {
      status,
      battleCount: rows.length,
      rewardWei: sumWei(rows),
    };
  });
}

function buildSkillBreakdown(project: ProjectWithTasks): ProjectBudgetSkillDto[] {
  return project.requiredSkills.map((skill) => {
    const rows = project.tasks.filter(
      (task) => task.status !== "CANCELLED" && task.requiredSkill === skill,
    );
    return {
      skill,
      battleCount: rows.length,
      rewardWei: sumWei(rows),
      covered: rows.length > 0,
    };
  });
}

function buildChronicle(
  project: ProjectWithTasks,
  decisions: readonly Decision[],
): ProjectChronicleEventDto[] {
  const taskById = new Map(project.tasks.map((task) => [task.id, task]));
  const events: ProjectChronicleEventDto[] = [
    {
      id: `${project.id}:created`,
      type: "PROJECT_CREATED",
      title: "Project created",
      description: `${project.title} opened with ${project.requiredSkills.length} required skill(s).`,
      battleId: null,
      battleTitle: null,
      chainTaskId: null,
      decisionId: null,
      chainDecisionId: null,
      actionType: null,
      confidence: null,
      riskScore: null,
      txHash: null,
      timestamp: project.createdAt.toISOString(),
    },
  ];

  for (const task of project.tasks) {
    events.push({
      id: `${task.id}:created`,
      type: "BATTLE_CREATED",
      title: "Battle posted",
      description: task.requiredSkill
        ? `${task.title} opened for ${task.requiredSkill}.`
        : `${task.title} opened.`,
      battleId: task.id,
      battleTitle: task.title,
      chainTaskId: task.chainTaskId,
      decisionId: null,
      chainDecisionId: null,
      actionType: null,
      confidence: null,
      riskScore: null,
      txHash: null,
      timestamp: task.createdAt.toISOString(),
    });

    if (task.status !== "OPEN" || task.updatedAt.getTime() !== task.createdAt.getTime()) {
      events.push({
        id: `${task.id}:status:${task.status}`,
        type: "BATTLE_STATUS",
        title: `Battle ${task.status.toLowerCase()}`,
        description: `${task.title} is currently ${task.status}.`,
        battleId: task.id,
        battleTitle: task.title,
        chainTaskId: task.chainTaskId,
        decisionId: null,
        chainDecisionId: null,
        actionType: null,
        confidence: null,
        riskScore: null,
        txHash: null,
        timestamp: task.updatedAt.toISOString(),
      });
    }
  }

  for (const decision of decisions) {
    const task = decision.taskId ? taskById.get(decision.taskId) : undefined;
    events.push({
      id: `${decision.id}:recorded`,
      type: "DECISION_RECORDED",
      title: "Decision proof recorded",
      description: `${decision.actionType} proof recorded with ${decision.confidence}% confidence and ${decision.riskScore}% risk.`,
      battleId: task?.id ?? decision.taskId,
      battleTitle: task?.title ?? null,
      chainTaskId: decision.chainTaskId,
      decisionId: decision.id,
      chainDecisionId: decision.chainDecisionId,
      actionType: decision.actionType,
      confidence: decision.confidence,
      riskScore: decision.riskScore,
      txHash: decision.txHash,
      timestamp: decision.createdAt.toISOString(),
    });
  }

  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 40);
}

function buildRecommendations(project: ProjectWithTasks): ProjectRecommendationDto[] {
  const activeSkillCoverage = new Set(
    project.tasks
      .filter((task) => task.status !== "CANCELLED" && task.requiredSkill !== null)
      .map((task) => task.requiredSkill as string),
  );
  const missingSkills = project.requiredSkills.filter((skill) => !activeSkillCoverage.has(skill));
  const remaining = BigInt(remainingTreasury(project, project.tasks));
  const deadlineDays = recommendationDeadlineDays(project, project.tasks);
  const priority = recommendationPriority(project, project.tasks);
  const rewardWei = recommendationRewardWei(remaining, Math.max(1, missingSkills.length));

  const skillRecommendations = missingSkills.map((skill): ProjectRecommendationDto => {
    const template = SKILL_TEMPLATES[skill] ?? {
      title: `Cover ${skill}`,
      description:
        "Create a focused Battle for this missing Project skill. Return evidence, confidence, risk notes and the next recommended sponsor action.",
    };
    return {
      id: `${project.slug}-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: template.title,
      description: template.description,
      requiredSkill: skill,
      rewardWei,
      deadlineDays,
      priority,
      rationale: `${skill} is required by the Project but has no active Battle coverage yet.`,
    };
  });

  if (skillRecommendations.length > 0) {
    return skillRecommendations.slice(0, 6);
  }

  if (riskLevel(project, project.tasks) === "HIGH") {
    return [
      {
        id: `${project.slug}-risk-review`,
        title: "Run a Project risk review",
        description:
          "Review open Battles, remaining treasury, deadline pressure and settlement blockers. Return a concise risk register and recommended sponsor actions.",
        requiredSkill: "CONTRACT_AUDIT",
        rewardWei: recommendationRewardWei(remaining, 1),
        deadlineDays: 1,
        priority: "HIGH",
        rationale: "The Project is high risk because deadline or treasury pressure is present.",
      },
    ];
  }

  if (project.tasks.length === 0 && project.requiredSkills.length === 0) {
    return [
      {
        id: `${project.slug}-kickoff`,
        title: "Create the first Project Battle",
        description:
          "Define the first measurable sponsor outcome, required evidence, confidence threshold and reward settlement criteria.",
        requiredSkill: null,
        rewardWei: recommendationRewardWei(remaining, 1),
        deadlineDays: 3,
        priority: "MEDIUM",
        rationale: "This Project has no Battles yet.",
      },
    ];
  }

  return [];
}

function recommendationRewardWei(remainingWei: bigint, buckets: number): string {
  if (remainingWei <= 0n) return DEFAULT_REWARD_WEI.toString();
  const share = remainingWei / BigInt(buckets);
  if (share < MIN_REWARD_WEI) return MIN_REWARD_WEI.toString();
  if (share > MAX_REWARD_WEI) return MAX_REWARD_WEI.toString();
  return share.toString();
}

function recommendationDeadlineDays(project: Project, tasks: readonly Task[]): number {
  const level = riskLevel(project, tasks);
  if (level === "HIGH") return 1;
  if (level === "MEDIUM") return 3;
  return 5;
}

function recommendationPriority(
  project: Project,
  tasks: readonly Task[],
): ProjectRecommendationDto["priority"] {
  const level = riskLevel(project, tasks);
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM") return "MEDIUM";
  return "LOW";
}

async function buildMatch(project: Project, agent: Agent): Promise<ProjectMatchDto> {
  const required = project.requiredSkills;
  const matchedSkills = required.filter((skill) => agent.skills.includes(skill));
  const missingSkills = required.filter((skill) => !agent.skills.includes(skill));
  const skillMatchPct =
    required.length === 0 ? 100 : Math.round((matchedSkills.length / required.length) * 100);
  const reputation = await reputationFor(agent);
  const matchScore = Math.round(skillMatchPct * 0.65 + reputation.score * 0.35);
  const reason =
    matchedSkills.length > 0
      ? `${agent.name} covers ${matchedSkills.join(", ")} with ${reputation.completedBattles} verified scoring event(s).`
      : `${agent.name} has no direct skill overlap yet; consider only if the Project scope changes.`;

  return {
    agentId: agent.id,
    chainAgentId: agent.chainAgentId,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    agentWallet: agent.agentWallet,
    skills: agent.skills,
    matchedSkills,
    missingSkills,
    skillMatchPct,
    reputationScore: reputation.score,
    completedBattles: reputation.completedBattles,
    matchScore,
    reason,
  };
}

async function reputationFor(agent: Agent): Promise<{ score: number; completedBattles: number }> {
  if (agent.chainAgentId === null) return { score: 0, completedBattles: 0 };
  const rows = await reputationRepository.listForChainAgent(agent.chainAgentId);
  if (rows.length === 0) return { score: 0, completedBattles: 0 };
  const score = Math.round(rows.reduce((sum, row) => sum + row.totalScore, 0) / rows.length);
  return { score, completedBattles: rows.length };
}

async function resolveProject(identifier: string): Promise<ProjectWithTasks | null> {
  const bySlug = await projectsRepository.findBySlug(identifier);
  if (bySlug) return bySlug;
  return projectsRepository.findById(identifier);
}
