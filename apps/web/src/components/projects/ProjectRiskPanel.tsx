"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectRisks } from "@/hooks/useProjects";
import type { ProjectRiskView, ProjectView } from "@/types";

function severityTone(severity: ProjectRiskView["severity"]): "crimson" | "gold" | "success" {
  if (severity === "HIGH") return "crimson";
  if (severity === "MEDIUM") return "gold";
  return "success";
}

function categoryTone(category: ProjectRiskView["category"]): "muted" | "info" | "gold" {
  if (category === "COVERAGE") return "gold";
  if (category === "SETTLEMENT") return "info";
  return "muted";
}

export function ProjectRiskPanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectRisks(project.slug);
  const risks = data?.data ?? [];
  const highCount = risks.filter((risk) => risk.severity === "HIGH").length;

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Risk register
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Sponsor risks to clear
          </h2>
          <p className="mt-1 text-sm text-muted">
            Risks are derived from deadline, treasury, required skills and Battle state.
          </p>
        </div>
        <Badge tone={highCount > 0 ? "crimson" : risks.length > 0 ? "gold" : "success"}>
          {highCount > 0 ? `${highCount} high` : `${risks.length} open`}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load Project risks.
        </div>
      ) : risks.length === 0 ? (
        <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-sm text-muted">
          No active Project risks detected.
        </div>
      ) : (
        <div className="grid gap-3">
          {risks.map((risk) => (
            <RiskRow key={risk.id} project={project} risk={risk} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RiskRow({ project, risk }: { project: ProjectView; risk: ProjectRiskView }) {
  const actionHref = riskActionHref(project, risk);

  return (
    <div className="rounded-xl border border-border bg-background/35 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(risk.severity)}>{risk.severity}</Badge>
            <Badge tone={categoryTone(risk.category)}>{risk.category}</Badge>
            {risk.requiredSkill && <Badge tone="muted">{risk.requiredSkill}</Badge>}
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{risk.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{risk.description}</p>
          <p className="mt-2 text-xs text-muted">{risk.suggestedAction}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-52">
          <MiniMetric label="Action" value={actionLabel(risk.actionType)} />
          {risk.chainTaskId !== null && <MiniMetric label="Battle" value={`#${risk.chainTaskId}`} />}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={actionHref}
          className="inline-flex h-9 items-center justify-center rounded-md bg-surface-2 px-3 text-sm font-semibold text-foreground transition-all duration-200 hover:border-gold/50 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {actionLabel(risk.actionType)}
        </Link>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-foreground">{value}</p>
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

function riskActionHref(project: ProjectView, risk: ProjectRiskView): string {
  if (risk.actionType === "FIND_SPARTANS") return "/agents";
  if (risk.actionType === "REVIEW_CHRONICLE") return `/projects/${project.slug}`;
  if (risk.actionType === "VERIFY_BATTLE" && risk.chainTaskId !== null) {
    return `/arena/${risk.chainTaskId}`;
  }
  if (risk.actionType === "ADD_BATTLE") {
    const params = new URLSearchParams({ project: project.slug });
    if (risk.requiredSkill) {
      params.set("skill", risk.requiredSkill);
      params.set("title", `Cover ${risk.requiredSkill}`);
      params.set(
        "description",
        `Create a focused Battle for ${risk.requiredSkill}. Include evidence, confidence, risk notes and next sponsor action.`,
      );
      params.set("reward", "2");
      params.set("days", risk.severity === "HIGH" ? "1" : "3");
    }
    return `/arena/new?${params.toString()}`;
  }
  return `/projects/${project.slug}`;
}
