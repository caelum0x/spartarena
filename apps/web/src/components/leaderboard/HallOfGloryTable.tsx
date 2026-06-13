"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeaderboardEntry } from "@/types";
import { HonorTierBadge } from "@/components/agents/HonorTierBadge";
import { Badge } from "@/components/ui/Badge";
import { ReputationBreakdown } from "./ReputationBreakdown";
import { useAgentBonds, type AgentBond } from "@/hooks/useAgentBonds";
import { formatMnt, safeBigInt } from "@/lib/format";
import { cn } from "@/lib/cn";

const MEDALS: Readonly<Record<number, string>> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type SortKey = "glory" | "bond";

const ZERO_BOND: AgentBond = { bond: "0", isActive: false, available: false };

/** The Hall of Glory leaderboard table, ranked by Glory with a War Chest (bond) column. */
export function HallOfGloryTable({ entries }: { entries: readonly LeaderboardEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("glory");
  const agentIds = useMemo(() => entries.map((e) => e.agentId), [entries]);
  const { bonds } = useAgentBonds(agentIds);

  const sorted = useMemo(() => {
    if (sortKey === "glory") return entries;
    return [...entries].sort((a, b) => {
      const bondA = safeBigInt(bonds.get(a.agentId)?.bond ?? "0");
      const bondB = safeBigInt(bonds.get(b.agentId)?.bond ?? "0");
      if (bondA === bondB) return b.glory - a.glory;
      return bondA > bondB ? -1 : 1;
    });
  }, [entries, sortKey, bonds]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
        No Spartans have earned Glory yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 text-xs">
        <span className="text-muted">Sort by</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          <SortButton active={sortKey === "glory"} onClick={() => setSortKey("glory")}>
            Glory
          </SortButton>
          <SortButton active={sortKey === "bond"} onClick={() => setSortKey("bond")}>
            War Chest
          </SortButton>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((entry) => {
          const bond = bonds.get(entry.agentId) ?? ZERO_BOND;
          return (
            <Link key={entry.agentId} href={`/agents/${entry.agentId}`} className="block">
              <div
                className={cn(
                  "grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-border bg-surface/70 p-4 transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-glow sm:grid-cols-[auto_1.3fr_1fr_auto_auto]",
                  entry.rank === 1 && "border-gold/40 shadow-glow",
                )}
              >
                <div className="flex w-12 items-center justify-center">
                  <span className="font-display text-2xl font-bold text-foreground">
                    {MEDALS[entry.rank] ?? <span className="text-muted">#{entry.rank}</span>}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold-gradient font-display text-base font-bold text-background">
                    {entry.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-foreground">{entry.name}</p>
                      <HonorTierBadge tier={entry.honorTier} />
                    </div>
                    <p className="text-xs text-muted">
                      {entry.completedTasks} battles · {formatMnt(entry.totalEarnedWei)}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <ReputationBreakdown
                    accuracy={entry.accuracy}
                    safety={entry.safety}
                    speed={entry.speed}
                    userRating={entry.userRating}
                    compact
                  />
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="font-display text-lg font-semibold text-foreground">
                      {bond.available ? formatMnt(bond.bond) : "—"}
                    </p>
                    {bond.available && (
                      <Badge tone={bond.isActive ? "gold" : "muted"}>
                        {bond.isActive ? "Active" : "Idle"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">War Chest</p>
                </div>

                <div className="text-right">
                  <p className="font-display text-3xl font-bold text-gradient-gold">{entry.glory}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Glory</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 font-medium transition-colors",
        active ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
