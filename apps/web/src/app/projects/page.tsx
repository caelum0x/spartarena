"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { Input } from "@/components/ui/Input";
import { SkeletonGrid } from "@/components/ui/SkeletonGrid";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/cn";
import { formatDate, formatMnt, shortAddress } from "@/lib/format";
import type { ProjectView } from "@/types";

const FILTERS = ["all", "PLANNING", "ACTIVE", "SETTLED", "ARCHIVED"] as const;

function progress(project: ProjectView): number {
  return project.progressPct;
}

function deadlineLabel(deadline: string | null): string {
  if (deadline === null) return "No deadline";
  return formatDate(Number(deadline));
}

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const visible = useMemo(() => {
    const projects = data?.data ?? [];
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = filter === "all" || project.status === filter;
      const matchesQuery =
        q.length === 0 ||
        project.title.toLowerCase().includes(q) ||
        project.summary.toLowerCase().includes(q) ||
        project.requiredSkills.some((skill) => skill.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [data, filter, query]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Projects"
        title={
          <span className="inline-flex items-center">
            Sponsor Workstreams
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description="Group Battles into protocol campaigns with treasury, skills, progress and recent execution in one place."
        actions={
          <>
            <Link href="/projects/new">
              <Button>Create Project</Button>
            </Link>
            <Link href="/arena/new">
              <Button variant="secondary">Post a Battle</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects, skills or summaries..."
          aria-label="Search projects"
          className="lg:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                filter === item
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border bg-surface/50 text-muted hover:text-foreground",
              )}
            >
              {item === "all" ? "All" : item[0] + item.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-12 text-center">
          <p className="text-muted">No Projects match this view.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </Container>
  );
}

function ProjectCard({ project }: { project: ProjectView }) {
  const done = progress(project);
  return (
    <Link href={`/projects/${project.slug}`} className="block h-full">
      <Card interactive className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={project.status === "ACTIVE" ? "success" : "muted"}>{project.status}</Badge>
            <span className="text-xs text-muted">Sponsor {shortAddress(project.sponsorWallet)}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{project.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{project.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-bold text-gradient-gold">
            {formatMnt(project.treasuryWei)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-muted">Treasury</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>{project.completedBattleCount} of {project.battleCount} Battles completed</span>
          <span>{done}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${done}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ProjectStat label="Open" value={String(project.openBattleCount)} />
        <ProjectStat label="Remaining" value={formatMnt(project.remainingTreasuryWei)} />
        <ProjectStat label="Deadline" value={deadlineLabel(project.deadline)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {project.requiredSkills.map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Recent Battles
        </p>
        <div className="space-y-2">
          {project.battles.slice(0, 3).map((battle) => (
            <div
              key={battle.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/35 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-foreground">{battle.title}</span>
              <span className="shrink-0 text-xs text-muted">{battle.status}</span>
            </div>
          ))}
        </div>
      </div>
      </Card>
    </Link>
  );
}

function ProjectStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/35 p-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
