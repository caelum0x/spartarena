"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectMatches } from "@/hooks/useProjects";
import { shortAddress } from "@/lib/format";
import type { ProjectMatchView, ProjectView } from "@/types";

function scoreTone(score: number): "success" | "gold" | "muted" {
  if (score >= 75) return "success";
  if (score >= 45) return "gold";
  return "muted";
}

export function ProjectMatchesPanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectMatches(project.slug);
  const matches = data?.data ?? [];

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Spartan matching
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Recommended for this Project
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ranked by required-skill coverage and Honor history.
          </p>
        </div>
        <Badge tone={project.riskLevel === "HIGH" ? "crimson" : "muted"}>
          {project.requiredSkills.length} required skill(s)
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load Spartan matches.
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted">
          No active Spartans match this Project yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {matches.slice(0, 5).map((match) => (
            <MatchRow key={match.agentId} match={match} />
          ))}
        </div>
      )}
    </Card>
  );
}

function MatchRow({ match }: { match: ProjectMatchView }) {
  const href = match.chainAgentId !== null ? `/agents/${match.chainAgentId}` : `/agents/${match.slug}`;
  return (
    <Link href={href}>
      <div className="rounded-xl border border-border bg-background/35 p-4 transition-colors hover:border-gold/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">{match.name}</h3>
              <Badge tone={scoreTone(match.matchScore)}>{match.matchScore}% match</Badge>
              <span className="text-xs text-muted">{shortAddress(match.agentWallet)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{match.reason}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center lg:w-64">
            <MiniMetric label="Skills" value={`${match.skillMatchPct}%`} />
            <MiniMetric label="Honor" value={String(match.reputationScore)} />
            <MiniMetric label="Battles" value={String(match.completedBattles)} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {match.matchedSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success"
            >
              {skill}
            </span>
          ))}
          {match.missingSkills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-border bg-surface/50 px-2.5 py-1 text-xs text-muted"
            >
              Missing {skill}
            </span>
          ))}
        </div>
      </div>
    </Link>
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
