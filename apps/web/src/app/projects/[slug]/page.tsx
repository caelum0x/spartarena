"use client";

import { use } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stat } from "@/components/ui/Stat";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { ProjectBudgetPanel } from "@/components/projects/ProjectBudgetPanel";
import { ProjectRiskPanel } from "@/components/projects/ProjectRiskPanel";
import { ProjectReadinessPanel } from "@/components/projects/ProjectReadinessPanel";
import { ProjectOperationsPanel } from "@/components/projects/ProjectOperationsPanel";
import { ProjectActivityPanel } from "@/components/projects/ProjectActivityPanel";
import { ProjectChroniclePanel } from "@/components/projects/ProjectChroniclePanel";
import { ProjectRecommendationsPanel } from "@/components/projects/ProjectRecommendationsPanel";
import { ProjectMatchesPanel } from "@/components/projects/ProjectMatchesPanel";
import { useProject } from "@/hooks/useProjects";
import { formatDate, formatMnt, shortAddress } from "@/lib/format";
import type { ProjectBattleView, ProjectView } from "@/types";

/** Status → badge tone for a Project's lifecycle. */
function statusTone(status: ProjectView["status"]): "success" | "gold" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "PLANNING") return "gold";
  return "muted";
}

function progressPct(project: ProjectView): number {
  return project.progressPct;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data, isLoading, isError, error } = useProject(slug);
  const project = data?.data;

  if (isLoading) {
    return (
      <Container className="py-20">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className="py-12">
        <ProjectErrorState
          title="Could not load this Project."
          detail={error instanceof Error ? error.message : undefined}
        />
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="py-12">
        <ProjectErrorState title="Project not found." />
      </Container>
    );
  }

  const done = progressPct(project);

  return (
    <Container className="py-12">
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-muted hover:text-foreground">
          ← All Projects
        </Link>
      </div>

      <PageHeader
        eyebrow={`Sponsor ${shortAddress(project.sponsorWallet)}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {project.title}
            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description={project.summary}
        actions={
          <Link href={`/arena/new?project=${project.slug}`}>
            <Button>Add Battle</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Treasury" value={formatMnt(project.treasuryWei)} />
        <Stat label="Rewards in play" value={formatMnt(project.totalRewardWei)} />
        <Stat label="Remaining" value={formatMnt(project.remainingTreasuryWei)} />
        <Stat label="Battles" value={`${project.completedBattleCount}/${project.battleCount}`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Deadline"
          value={project.deadline ? formatDate(Number(project.deadline)) : "None"}
        />
        <Stat label="Risk" value={project.riskLevel} />
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Campaign progress</span>
          <span>{done}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${done}%` }} />
        </div>
      </div>

      {project.requiredSkills.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {project.requiredSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <ProjectBudgetPanel project={project} />

      <ProjectRiskPanel project={project} />

      <ProjectReadinessPanel project={project} />

      <ProjectOperationsPanel project={project} />

      <ProjectActivityPanel project={project} />

      <ProjectChroniclePanel project={project} />

      <ProjectRecommendationsPanel project={project} />

      <ProjectMatchesPanel project={project} />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-bold text-foreground">
          Battles in this campaign
          <span className="ml-2 text-sm font-normal text-muted">{project.battleCount}</span>
        </h2>
        {project.battles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
            No Battles have been posted to this Project yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {project.battles.map((battle) => (
              <BattleRow key={battle.id} battle={battle} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}

function BattleRow({ battle }: { battle: ProjectBattleView }) {
  const inner = (
    <Card
      interactive={battle.chainTaskId !== null}
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{battle.title}</p>
        <p className="mt-0.5 truncate text-sm text-muted">{battle.description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {battle.requiredSkill && <Badge tone="muted">{battle.requiredSkill}</Badge>}
        <span className="text-sm font-semibold text-gold">{formatMnt(battle.rewardWei)}</span>
        <Badge tone="muted">{battle.status}</Badge>
      </div>
    </Card>
  );

  if (battle.chainTaskId !== null) {
    return <Link href={`/arena/${battle.chainTaskId}`}>{inner}</Link>;
  }
  return inner;
}

function ProjectErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
      {title}
      {detail && <span className="mt-1 block text-sm text-muted">{detail}</span>}
      <div className="mt-5">
        <Link href="/projects">
          <Button variant="secondary">Back to Projects</Button>
        </Link>
      </div>
    </div>
  );
}
