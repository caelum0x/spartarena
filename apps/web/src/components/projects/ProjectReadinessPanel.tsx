"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectReadiness } from "@/hooks/useProjects";
import type {
  ProjectReadinessBlockerView,
  ProjectReadinessCheckView,
  ProjectReadinessView,
  ProjectRiskView,
  ProjectView,
} from "@/types";

function severityTone(severity: ProjectReadinessBlockerView["severity"]): "crimson" | "gold" | "success" {
  if (severity === "HIGH") return "crimson";
  if (severity === "MEDIUM") return "gold";
  return "success";
}

export function ProjectReadinessPanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectReadiness(project.slug);
  const readiness = data?.data;

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Settlement readiness
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Closeout checklist
          </h2>
          <p className="mt-1 text-sm text-muted">
            Readiness is derived from Battle completion, proof state, risk and required skill coverage.
          </p>
        </div>
        <Badge tone={readiness?.readyToSettle ? "success" : "gold"}>
          {readiness?.readyToSettle ? "Ready" : "In progress"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError || !readiness ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load settlement readiness.
        </div>
      ) : (
        <ReadinessContent project={project} readiness={readiness} />
      )}
    </Card>
  );
}

function ReadinessContent({
  project,
  readiness,
}: {
  project: ProjectView;
  readiness: ProjectReadinessView;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-xl border border-border bg-background/35 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Readiness score</p>
          <p className="mt-3 font-display text-4xl font-bold text-foreground">{readiness.scorePct}%</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{readiness.summary}</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gold-gradient"
              style={{ width: `${readiness.scorePct}%` }}
            />
          </div>
          <p className="mt-4 text-xs text-muted">{readiness.nextAction}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniMetric label="Completed" value={`${readiness.completedBattleCount} Battle(s)`} />
          <MiniMetric label="Unsettled" value={`${readiness.unsettledBattleCount} Battle(s)`} />
          <MiniMetric label="Blockers" value={String(readiness.blockers.length)} />
          <MiniMetric label="Archive" value={readiness.readyToArchive ? "Ready" : "Not ready"} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Checklist
          </p>
          <div className="space-y-2">
            {readiness.checklist.map((check) => (
              <ChecklistRow key={check.id} check={check} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Blockers
          </p>
          {readiness.blockers.length === 0 ? (
            <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-sm text-muted">
              No settlement blockers detected.
            </div>
          ) : (
            <div className="space-y-2">
              {readiness.blockers.slice(0, 5).map((blocker) => (
                <BlockerRow key={blocker.id} project={project} blocker={blocker} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({ check }: { check: ProjectReadinessCheckView }) {
  return (
    <div className="rounded-xl border border-border bg-background/35 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{check.label}</p>
          <p className="mt-0.5 text-xs text-muted">{check.detail}</p>
        </div>
        <Badge tone={check.complete ? "success" : "gold"}>{check.complete ? "Complete" : "Open"}</Badge>
      </div>
    </div>
  );
}

function BlockerRow({
  project,
  blocker,
}: {
  project: ProjectView;
  blocker: ProjectReadinessBlockerView;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/35 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(blocker.severity)}>{blocker.severity}</Badge>
            {blocker.requiredSkill && <Badge tone="muted">{blocker.requiredSkill}</Badge>}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{blocker.label}</p>
          <p className="mt-0.5 text-xs text-muted">{blocker.detail}</p>
        </div>
        <Link
          href={blockerActionHref(project, blocker)}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-surface-2 px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {actionLabel(blocker.actionType)}
        </Link>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/35 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function actionLabel(actionType: ProjectRiskView["actionType"]): string {
  switch (actionType) {
    case "ADD_BATTLE":
      return "Draft Battle";
    case "UPDATE_PROJECT":
      return "Update Project";
    case "FIND_SPARTANS":
      return "Find Spartans";
    case "REVIEW_CHRONICLE":
      return "Review Chronicle";
    case "VERIFY_BATTLE":
      return "Review Battle";
  }
}

function blockerActionHref(project: ProjectView, blocker: ProjectReadinessBlockerView): string {
  if (blocker.actionType === "FIND_SPARTANS") return "/agents";
  if (blocker.actionType === "VERIFY_BATTLE" && blocker.chainTaskId !== null) {
    return `/arena/${blocker.chainTaskId}`;
  }
  if (blocker.actionType === "ADD_BATTLE") {
    const params = new URLSearchParams({ project: project.slug });
    if (blocker.requiredSkill) {
      params.set("skill", blocker.requiredSkill);
      params.set("title", `Cover ${blocker.requiredSkill}`);
      params.set(
        "description",
        `Create a focused Battle for ${blocker.requiredSkill}. Include evidence, confidence, risk notes and next sponsor action.`,
      );
      params.set("reward", "2");
      params.set("days", blocker.severity === "HIGH" ? "1" : "3");
    }
    return `/arena/new?${params.toString()}`;
  }
  return `/projects/${project.slug}`;
}
