"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { BattleStatusBadge } from "@/components/arena/BattleStatusBadge";
import { BattleTimeline } from "@/components/arena/BattleTimeline";
import { RewardVault } from "@/components/arena/RewardVault";
import { SkillBadge } from "@/components/agents/SkillBadge";
import { DecisionCard } from "@/components/decisions/DecisionCard";
import { HashViewer } from "@/components/decisions/HashViewer";
import { useTask } from "@/hooks/useTasks";
import { useTaskDecisions } from "@/hooks/useDecisions";
import { formatDate, formatDeadline, shortAddress } from "@/lib/format";

export default function BattleDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId: rawId } = use(params);
  const taskId = Number.parseInt(rawId, 10);

  const { data, isLoading } = useTask(taskId);
  const { data: decisionData } = useTaskDecisions(taskId);

  if (!Number.isFinite(taskId)) notFound();

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center py-32">
        <Spinner className="h-8 w-8" />
      </Container>
    );
  }

  const task = data?.data;
  if (!task) {
    return (
      <Container className="py-20 text-center">
        <p className="text-muted">Battle #{taskId} was not found.</p>
        <Link href="/arena" className="mt-4 inline-block text-gold hover:underline">
          ← Back to the Arena
        </Link>
      </Container>
    );
  }

  const decisions = decisionData?.data ?? [];

  return (
    <Container className="py-12">
      <Link href="/arena" className="mb-6 inline-block text-sm text-muted hover:text-gold">
        ← Back to the Arena
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <BattleStatusBadge status={task.status} />
              {task.requiredSkill && <SkillBadge code={task.requiredSkill} />}
              {data && <DataSourceNotice source={data.source} />}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold text-foreground">{task.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Posted by {shortAddress(task.creator)} · {formatDate(task.createdAt)} · Deadline{" "}
              {formatDeadline(task.deadline)}
            </p>
          </div>

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Brief</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {task.description}
            </p>
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <HashViewer label="Description hash" hash={task.descriptionHash} />
              {task.resultHash && <HashViewer label="Result hash" hash={task.resultHash} />}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">War Chronicle</h2>
              <Badge tone="muted">{decisions.length} entries</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {decisions.length === 0 ? (
                <p className="text-sm text-muted">
                  No decisions recorded for this Battle yet. They appear here once a Spartan acts.
                </p>
              ) : (
                decisions.map((decision) => (
                  <DecisionCard key={decision.decisionId} decision={decision} />
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <RewardVault task={task} />

          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Lifecycle</h2>
            <BattleTimeline status={task.status} />
          </Card>

          {task.assignedAgentName && (
            <Card>
              <p className="text-xs uppercase tracking-wider text-muted">Assigned Spartan</p>
              <Link
                href={`/agents/${task.assignedAgentId}`}
                className="mt-1 inline-flex items-center gap-2 font-display text-lg font-semibold text-gold hover:underline"
              >
                {task.assignedAgentName} →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
