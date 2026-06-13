"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useProjectBudget } from "@/hooks/useProjects";
import { formatMnt } from "@/lib/format";
import type { ProjectBudgetStatusView, ProjectBudgetView, ProjectView } from "@/types";

function statusTone(status: string): "success" | "gold" | "muted" | "crimson" {
  if (status === "VERIFIED" || status === "PAID") return "success";
  if (status === "OPEN") return "gold";
  if (status === "CANCELLED") return "crimson";
  return "muted";
}

export function ProjectBudgetPanel({ project }: { project: ProjectView }) {
  const { data, isLoading, isError } = useProjectBudget(project.slug);
  const budget = data?.data;

  return (
    <Card className="mt-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Budget control
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
            Treasury allocation
          </h2>
          <p className="mt-1 text-sm text-muted">
            Reward allocation by Battle status and required skill coverage.
          </p>
        </div>
        <Badge tone={budget?.oversubscribed ? "crimson" : "muted"}>
          {budget?.oversubscribed ? "Oversubscribed" : "Within treasury"}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError || !budget ? (
        <div className="rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-crimson-soft">
          Could not load Project budget.
        </div>
      ) : (
        <BudgetContent budget={budget} />
      )}
    </Card>
  );
}

function BudgetContent({ budget }: { budget: ProjectBudgetView }) {
  const allocatedPct =
    BigInt(budget.treasuryWei) > 0n
      ? Math.min(100, Number((BigInt(budget.allocatedWei) * 100n) / BigInt(budget.treasuryWei)))
      : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BudgetMetric label="Treasury" value={formatMnt(budget.treasuryWei)} />
        <BudgetMetric label="Allocated" value={formatMnt(budget.allocatedWei)} />
        <BudgetMetric label="Remaining" value={formatMnt(budget.remainingWei)} />
        <BudgetMetric label="Runway" value={`${budget.runwayBattleCount} Battle(s)`} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Allocated rewards</span>
          <span>{allocatedPct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${allocatedPct}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Status allocation
          </p>
          <div className="space-y-2">
            {budget.statusBreakdown
              .filter((row) => row.battleCount > 0 || row.rewardWei !== "0")
              .map((row) => (
                <StatusRow key={row.status} row={row} />
              ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Skill coverage
            </p>
            <span className="text-xs text-muted">{budget.coveragePct}% covered</span>
          </div>
          {budget.skillBreakdown.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted">
              No required skills are configured for this Project.
            </div>
          ) : (
            <div className="space-y-2">
              {budget.skillBreakdown.map((row) => (
                <div
                  key={row.skill}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background/35 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.skill}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.battleCount} Battle(s) · {formatMnt(row.rewardWei)}
                    </p>
                  </div>
                  <Badge tone={row.covered ? "success" : "gold"}>
                    {row.covered ? "Covered" : "Open gap"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <BudgetMetric label="Open rewards" value={formatMnt(budget.openWei)} />
        <BudgetMetric label="Active rewards" value={formatMnt(budget.activeWei)} />
        <BudgetMetric label="Completed rewards" value={formatMnt(budget.completedWei)} />
      </div>
    </div>
  );
}

function StatusRow({ row }: { row: ProjectBudgetStatusView }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/35 px-3 py-2.5">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(row.status)}>{row.status}</Badge>
          <span className="text-sm text-muted">{row.battleCount} Battle(s)</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-gold">{formatMnt(row.rewardWei)}</span>
    </div>
  );
}

function BudgetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/35 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
