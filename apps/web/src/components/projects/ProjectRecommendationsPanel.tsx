"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectRecommendations } from "@/hooks/useProjects";
import { formatMnt } from "@/lib/format";
import type { ProjectRecommendationView, ProjectView } from "@/types";

function priorityTone(priority: ProjectRecommendationView["priority"]): "crimson" | "gold" | "muted" {
  if (priority === "HIGH") return "crimson";
  if (priority === "MEDIUM") return "gold";
  return "muted";
}

export function ProjectRecommendationsPanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectRecommendations(project.slug);
  const recommendations = data?.data ?? [];

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Battle recommendations
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Coverage gaps to post next
          </h2>
          <p className="mt-1 text-sm text-muted">
            Drafts are generated from missing skill coverage, treasury and Project risk.
          </p>
        </div>
        <Badge tone={recommendations.length > 0 ? "gold" : "success"}>
          {recommendations.length} draft(s)
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load Battle recommendations.
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-sm text-muted">
          Required skills already have active Battle coverage.
        </div>
      ) : (
        <div className="grid gap-3">
          {recommendations.map((recommendation) => (
            <RecommendationRow
              key={recommendation.id}
              project={project}
              recommendation={recommendation}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function RecommendationRow({
  project,
  recommendation,
}: {
  project: ProjectView;
  recommendation: ProjectRecommendationView;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/35 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {recommendation.title}
            </h3>
            <Badge tone={priorityTone(recommendation.priority)}>{recommendation.priority}</Badge>
            {recommendation.requiredSkill && <Badge tone="muted">{recommendation.requiredSkill}</Badge>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
            {recommendation.description}
          </p>
          <p className="mt-2 text-xs text-muted">{recommendation.rationale}</p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 text-center sm:w-56">
          <MiniMetric label="Reward" value={formatMnt(recommendation.rewardWei)} />
          <MiniMetric label="Deadline" value={`${recommendation.deadlineDays}d`} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          href={draftBattleHref(project, recommendation)}
          className="inline-flex h-9 items-center justify-center rounded-md bg-gold-gradient px-3 text-sm font-semibold text-background shadow-glow transition-all duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Draft Battle
        </Link>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function draftBattleHref(project: ProjectView, recommendation: ProjectRecommendationView): string {
  const params = new URLSearchParams({
    project: project.slug,
    title: recommendation.title,
    description: recommendation.description,
    reward: weiToMntInput(recommendation.rewardWei),
    days: String(recommendation.deadlineDays),
  });
  if (recommendation.requiredSkill) {
    params.set("skill", recommendation.requiredSkill);
  }
  return `/arena/new?${params.toString()}`;
}

function weiToMntInput(wei: string): string {
  const value = BigInt(wei);
  const base = 10n ** 18n;
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) return whole.toString();
  const fractionText = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fractionText}`;
}
