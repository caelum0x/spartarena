"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealPoolView } from "@/types";

/**
 * Risk-adjusted score: discount estimated APR by the pool's risk score.
 * A missing risk score is treated as neutral (50). Higher is better.
 */
function riskAdjustedScore(pool: ByrealPoolView): number {
  return pool.estimatedAprPct * (1 - (pool.riskScore ?? 50) / 100);
}

/** Badge tone for a 0-100 risk score (higher = riskier). */
function riskTone(riskScore: number | undefined): "crimson" | "gold" | "success" | "muted" {
  if (riskScore === undefined) return "muted";
  if (riskScore >= 60) return "crimson";
  if (riskScore >= 30) return "gold";
  return "success";
}

/** One-line, data-derived rationale for a ranked pool. */
function rationale(pool: ByrealPoolView): string {
  const risk = pool.riskScore ?? 50;
  const deepLiquidity = pool.tvlUsd >= 1_000_000;
  const highApr = pool.estimatedAprPct >= 10;

  if (risk >= 60) return "Elevated risk — size carefully.";
  if (highApr && deepLiquidity && risk < 30) {
    return "High APR with deep liquidity and low risk.";
  }
  if (highApr && risk < 30) return "Strong APR at low risk — thin liquidity, mind slippage.";
  if (deepLiquidity && risk < 30) return "Deep liquidity and low risk — steady, modest yield.";
  if (highApr) return "High APR offsets moderate risk.";
  if (deepLiquidity) return "Deep liquidity with moderate, dependable yield.";
  return "Balanced risk and reward.";
}

const FILTERS = {
  all: { label: "All", fn: () => true },
  lowRisk: { label: "Low risk", fn: (p: ByrealPoolView) => (p.riskScore ?? 50) < 30 },
  deepLiquidity: { label: "Deep liquidity", fn: (p: ByrealPoolView) => p.tvlUsd >= 1_000_000 },
  highApr: { label: "High APR", fn: (p: ByrealPoolView) => p.estimatedAprPct >= 10 },
} as const;

type FilterKey = keyof typeof FILTERS;

export default function ByrealYieldPage() {
  const { data, isLoading, isError, error } = useByrealPools();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const ranked = useMemo(() => {
    const all = data?.data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = all.filter((p) => {
      if (!FILTERS[filter].fn(p)) return false;
      if (q.length > 0 && !p.pairLabel.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => riskAdjustedScore(b) - riskAdjustedScore(a));
  }, [data, query, filter]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Yield Opportunities"
        description="Real Byreal (Solana) liquidity pools ranked by risk-adjusted LP yield — estimated fee APR discounted by each pool's on-chain risk score, so deep, low-risk yield rises above headline numbers. Filter by risk, liquidity and APR to find where capital works hardest."
      />

      <ByrealTabs />

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pair…"
            aria-label="Search pools by pair"
            className="lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  filter === key
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-surface/50 text-muted hover:text-foreground",
                )}
              >
                {FILTERS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal yield opportunities.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </div>
      ) : ranked.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No Byreal pools match this view.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ranked.map((pool, index) => {
            const rank = index + 1;
            const isBest = rank === 1;
            const score = riskAdjustedScore(pool);
            const tone = riskTone(pool.riskScore);
            return (
              <Card key={pool.poolAddress} glow={isBest} className={cn(isBest && "border-gold/40")}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold",
                        isBest
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-border bg-surface/60 text-muted",
                      )}
                    >
                      {rank}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/byreal/pools/${pool.poolAddress}`}
                          className="font-display text-lg font-semibold text-foreground hover:text-gold"
                        >
                          {pool.pairLabel}
                        </Link>
                        {isBest && <Badge tone="gold">★ Best risk-adjusted</Badge>}
                        {pool.feeBps !== undefined && (
                          <Badge tone="info">{pool.feeBps}bps fee</Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-muted">{rationale(pool)}</p>
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-muted">Risk-adj. score</p>
                    <p
                      className={cn(
                        "font-display text-3xl font-bold",
                        isBest ? "text-gold" : "text-foreground",
                      )}
                    >
                      {score.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Est. APR" value={pct1(pool.estimatedAprPct)} />
                  <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
                  <Stat label="24h Volume" value={formatUsd(pool.volume24hUsd)} />
                  <Stat
                    label="Utilization"
                    value={
                      pool.utilizationPct !== undefined
                        ? `${Math.round(pool.utilizationPct)}%`
                        : "—"
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone={tone}>
                    Risk {pool.riskScore !== undefined ? Math.round(pool.riskScore) : "—"}
                  </Badge>
                  {pool.confidence !== undefined && (
                    <Badge tone="muted">{Math.round(pool.confidence)}% confidence</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
