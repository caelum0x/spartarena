import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatMnt } from "@/lib/format";
import type { ProjectBattleView, ProjectView } from "@/types";

function nextAction(project: ProjectView): string {
  if (project.status === "PLANNING") return "Activate the Project when sponsor scope is ready.";
  if (project.status === "SETTLED") return "Review completed proofs and archive when no follow-up Battles remain.";
  if (project.status === "ARCHIVED") return "This Project is archived.";
  if (project.openBattleCount > 0) return "Assign open Battles to qualified Spartans.";
  if (project.remainingTreasuryWei !== "0") return "Post another Battle or settle remaining treasury off-chain.";
  return "Project treasury is fully allocated; wait for verification or settle the Project.";
}

function battleTone(status: string): "success" | "gold" | "muted" | "crimson" {
  if (status === "PAID" || status === "VERIFIED") return "success";
  if (status === "OPEN") return "gold";
  if (status === "CANCELLED") return "crimson";
  return "muted";
}

export function ProjectActivityPanel({ project }: { project: ProjectView }) {
  return (
    <Card className="mt-8">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Operator next step
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            {project.riskLevel === "HIGH" ? "Needs attention" : "Campaign control"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{nextAction(project)}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/arena/new?project=${project.slug}`}>
              <Button size="sm">Add Battle</Button>
            </Link>
            <Link href="/agents">
              <Button size="sm" variant="secondary">Find Spartans</Button>
            </Link>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Recent activity
            </p>
            <span className="text-xs text-muted">
              Updated {formatDate(Math.floor(new Date(project.lastActivityAt).getTime() / 1000))}
            </span>
          </div>
          {project.battles.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted">
              No Battle activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {project.battles.slice(0, 4).map((battle) => (
                <ActivityRow key={battle.id} battle={battle} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ActivityRow({ battle }: { battle: ProjectBattleView }) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/35 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{battle.title}</p>
        <p className="mt-0.5 text-xs text-muted">{formatMnt(battle.rewardWei)}</p>
      </div>
      <Badge tone={battleTone(battle.status)}>{battle.status}</Badge>
    </div>
  );
  return battle.chainTaskId !== null ? (
    <Link href={`/arena/${battle.chainTaskId}`}>{content}</Link>
  ) : (
    content
  );
}
