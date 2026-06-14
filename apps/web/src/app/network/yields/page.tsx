"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { useMantleYields, type MantleYieldPool } from "@/hooks/useMantleYields";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Capitalize a protocol slug for display ("aave" → "Aave"). */
function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const FILTERS = {
  all: { label: "All", fn: () => true },
  stablecoin: { label: "Stablecoin", fn: (p: MantleYieldPool) => p.stablecoin === true },
  noIl: { label: "No IL", fn: (p: MantleYieldPool) => p.ilRisk === "no" },
  highApy: { label: "High APY", fn: (p: MantleYieldPool) => p.apy >= 8 },
} as const;

type FilterKey = keyof typeof FILTERS;

export default function MantleYieldsPage() {
  const { data, isLoading, isError, error } = useMantleYields();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const pools = useMemo<readonly MantleYieldPool[]>(() => {
    const all = data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (!FILTERS[filter].fn(p)) return false;
      if (
        q.length > 0 &&
        !p.project.toLowerCase().includes(q) &&
        !p.symbol.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data, query, filter]);

  const summary = useMemo(() => {
    const highestApy = pools.reduce((max, p) => Math.max(max, p.apy), 0);
    const totalTvl = pools.reduce((sum, p) => sum + p.tvlUsd, 0);
    const protocols = new Set(pools.map((p) => p.project)).size;
    return { count: pools.length, highestApy, totalTvl, protocols };
  }, [pools]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Mantle Yields"
        description="Top yield opportunities across the Mantle DeFi ecosystem — real pools from Aave and every other Mantle protocol, aggregated from DefiLlama and ranked by APY. APYs vary with market conditions and rewards; always verify before depositing."
      />

      <NetworkTabs />

      {!isLoading && !isError && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pools" value={summary.count.toString()} />
          <Stat label="Highest APY" value={pct1(summary.highestApy)} />
          <Stat label="Total TVL" value={formatUsd(summary.totalTvl)} hint="Across listed pools" />
          <Stat label="Protocols" value={summary.protocols.toString()} />
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search protocol or symbol…"
            aria-label="Search yield pools by protocol or symbol"
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
        <Card className="border-crimson/30 bg-crimson/5 p-10 text-center">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle yield opportunities.
          </p>
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </Card>
      ) : pools.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No Mantle pools match this view.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pools.map((pool, index) => {
            const rank = index + 1;
            const isBest = rank === 1;
            const hasSplit = pool.apyBase !== null || pool.apyReward !== null;
            return (
              <Card key={pool.id} glow={isBest} className={cn(isBest && "border-gold/40")}>
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
                        {pool.id ? (
                          <Link
                            href={`https://defillama.com/yields/pool/${pool.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-display text-lg font-semibold text-foreground hover:text-gold"
                          >
                            {capitalize(pool.project)}
                          </Link>
                        ) : (
                          <span className="font-display text-lg font-semibold text-foreground">
                            {capitalize(pool.project)}
                          </span>
                        )}
                        <span className="font-mono text-sm text-foreground/80">{pool.symbol}</span>
                        {pool.poolMeta && <Badge tone="muted">{pool.poolMeta}</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {pool.stablecoin && <Badge tone="success">Stablecoin</Badge>}
                        {pool.ilRisk === "no" ? (
                          <Badge tone="info">No IL risk</Badge>
                        ) : pool.ilRisk === "yes" ? (
                          <Badge tone="crimson">IL risk</Badge>
                        ) : null}
                        {pool.exposure && <Badge tone="muted">{capitalize(pool.exposure)}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-muted">APY</p>
                    <p className="font-display text-3xl font-bold text-gold">{pct1(pool.apy)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
                  <Stat
                    label="Base APY"
                    value={pool.apyBase !== null ? pct1(pool.apyBase) : "—"}
                  />
                  <Stat
                    label="Reward APY"
                    value={pool.apyReward !== null ? pct1(pool.apyReward) : "—"}
                  />
                </div>
                {!hasSplit && (
                  <p className="mt-3 text-xs text-muted">
                    Base/reward split not reported for this pool.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">Source: DefiLlama</p>
    </Container>
  );
}
