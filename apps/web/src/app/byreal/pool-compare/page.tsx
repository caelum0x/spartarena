"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealPoolView } from "@/types";

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;

/** A metric row in the comparison grid. */
interface MetricRow {
  readonly key: string;
  readonly label: string;
  /** Renders the cell value for a pool. */
  readonly render: (pool: ByrealPoolView) => React.ReactNode;
  /** Numeric value used to pick the best column, or null when not comparable. */
  readonly value: (pool: ByrealPoolView) => number | null;
  /** Which extreme wins the gold highlight, or "none" to skip highlighting. */
  readonly best: "max" | "min" | "none";
}

function muted(): React.ReactNode {
  return <span className="text-muted">—</span>;
}

const ROWS: readonly MetricRow[] = [
  {
    key: "tvl",
    label: "TVL",
    render: (p) => formatUsd(p.tvlUsd),
    value: (p) => p.tvlUsd,
    best: "max",
  },
  {
    key: "apr",
    label: "Est. APR",
    render: (p) => pct1(p.estimatedAprPct),
    value: (p) => p.estimatedAprPct,
    best: "max",
  },
  {
    key: "volume",
    label: "24h volume",
    render: (p) => formatUsd(p.volume24hUsd),
    value: (p) => p.volume24hUsd,
    best: "max",
  },
  {
    key: "fee",
    label: "Fee (bps)",
    render: (p) => (p.feeBps === undefined ? muted() : `${p.feeBps} bps`),
    value: () => null,
    best: "none",
  },
  {
    key: "utilization",
    label: "Utilization",
    render: (p) => (p.utilizationPct === undefined ? muted() : pct1(p.utilizationPct)),
    value: (p) => p.utilizationPct ?? null,
    best: "max",
  },
  {
    key: "risk",
    label: "Risk score",
    render: (p) => (p.riskScore === undefined ? muted() : `${Math.round(p.riskScore)}/100`),
    value: (p) => p.riskScore ?? null,
    best: "min",
  },
  {
    key: "confidence",
    label: "Confidence",
    render: (p) => (p.confidence === undefined ? muted() : `${Math.round(p.confidence)}/100`),
    value: (p) => p.confidence ?? null,
    best: "max",
  },
] as const;

/**
 * Index of the best (winning) column for a row, or null when no column wins
 * (non-comparable row, all values equal, or fewer than two comparable values).
 */
function bestColumnIndex(row: MetricRow, pools: readonly ByrealPoolView[]): number | null {
  if (row.best === "none") return null;
  const values = pools.map((p) => row.value(p));
  const comparable = values.filter((v): v is number => v !== null);
  if (comparable.length < 2) return null;

  let bestIdx: number | null = null;
  let bestVal: number | null = null;
  values.forEach((v, idx) => {
    if (v === null) return;
    if (bestVal === null || (row.best === "max" ? v > bestVal : v < bestVal)) {
      bestVal = v;
      bestIdx = idx;
    }
  });

  // No highlight when every comparable value ties.
  if (bestVal !== null && comparable.every((v) => v === bestVal)) return null;
  return bestIdx;
}

function poolHref(poolAddress: string): string {
  return `/byreal/pools/${poolAddress}`;
}

export default function ByrealPoolComparePage() {
  const { data, isLoading, isError, error } = useByrealPools();
  const pools = useMemo(() => data?.data ?? [], [data]);

  const byAddress = useMemo(
    () => new Map(pools.map((p) => [p.poolAddress, p])),
    [pools],
  );

  // Selected pool addresses, one per comparison column. Seeded once the real pool
  // list loads with the two highest-TVL pools.
  const [selected, setSelected] = useState<readonly string[]>([]);

  useEffect(() => {
    if (selected.length > 0 || pools.length < MIN_COLUMNS) return;
    const topByTvl = [...pools]
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, MIN_COLUMNS)
      .map((p) => p.poolAddress);
    setSelected(topByTvl);
  }, [pools, selected.length]);

  const columns = useMemo(
    () =>
      selected
        .map((address) => byAddress.get(address))
        .filter((p): p is ByrealPoolView => p !== undefined),
    [selected, byAddress],
  );

  const setColumn = (index: number, address: string): void => {
    setSelected((prev) => prev.map((a, i) => (i === index ? address : a)));
  };

  const addColumn = (): void => {
    setSelected((prev) => {
      if (prev.length >= MAX_COLUMNS) return prev;
      const used = new Set(prev);
      const next = pools.find((p) => !used.has(p.poolAddress));
      return next ? [...prev, next.poolAddress] : prev;
    });
  };

  const removeColumn = (index: number): void => {
    setSelected((prev) =>
      prev.length <= MIN_COLUMNS ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const bestByRow = useMemo(
    () => new Map(ROWS.map((row) => [row.key, bestColumnIndex(row, columns)])),
    [columns],
  );

  const gridTemplate = {
    gridTemplateColumns: `minmax(8rem,11rem) repeat(${columns.length}, minmax(0,1fr))`,
  };

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Compare Pools"
        description="Put 2–4 Byreal (Solana) liquidity pools head to head — real TVL, estimated fee APR, 24h volume, fee tier, utilization, plus the ByrealPoolAnalyst's blended risk and confidence scores. The strongest value in each row is flagged in gold. Reads are wired for real."
      />

      <ByrealTabs />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal pools to compare.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </div>
      ) : pools.length < MIN_COLUMNS ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          At least two Byreal pools are needed to compare. Only {pools.length} loaded.
        </div>
      ) : (
        <>
          {/* Column pickers */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((pool, index) => (
              <div key={`picker-${index}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted">
                    Pool {index + 1}
                  </label>
                  {selected.length > MIN_COLUMNS && (
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      aria-label={`Remove pool ${index + 1}`}
                      className="text-xs text-muted transition-colors hover:text-crimson-soft"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <select
                  className={SELECT_CLASS}
                  value={pool.poolAddress}
                  onChange={(e) => setColumn(index, e.target.value)}
                  aria-label={`Select pool ${index + 1}`}
                >
                  {pools.map((p) => (
                    <option key={p.poolAddress} value={p.poolAddress}>
                      {p.pairLabel}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {selected.length < MAX_COLUMNS && (
              <button
                type="button"
                onClick={addColumn}
                className="flex min-h-[3.5rem] items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold"
              >
                + Add pool
              </button>
            )}
          </div>

          {/* lg+: comparison grid */}
          <Card className="hidden overflow-x-auto p-0 lg:block">
            <div className="min-w-full">
              {/* Header row: pair labels link to pool detail */}
              <div className="grid items-stretch border-b border-border" style={gridTemplate}>
                <div className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted">
                  Metric
                </div>
                {columns.map((pool, index) => (
                  <div
                    key={`head-${pool.poolAddress}-${index}`}
                    className="border-l border-border px-5 py-4"
                  >
                    <Link
                      href={poolHref(pool.poolAddress)}
                      className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {pool.pairLabel}
                    </Link>
                    {pool.topPick && (
                      <Badge tone="gold" className="mt-1.5">
                        ★ Top pick
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Metric rows */}
              {ROWS.map((row, rowIdx) => {
                const bestIdx = bestByRow.get(row.key) ?? null;
                return (
                  <div
                    key={row.key}
                    className={cn(
                      "grid items-stretch",
                      rowIdx < ROWS.length - 1 && "border-b border-border/60",
                    )}
                    style={gridTemplate}
                  >
                    <div className="px-5 py-4 text-sm font-medium text-muted">{row.label}</div>
                    {columns.map((pool, index) => {
                      const isBest = bestIdx === index;
                      return (
                        <div
                          key={`${row.key}-${pool.poolAddress}-${index}`}
                          className={cn(
                            "border-l border-border px-5 py-4 text-sm",
                            isBest
                              ? "bg-gold/10 font-semibold text-foreground"
                              : "text-foreground/90",
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {row.render(pool)}
                            {isBest && <span className="text-xs text-gold">★</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* < lg: stacked cards, one per pool */}
          <div className="grid gap-5 sm:grid-cols-2 lg:hidden">
            {columns.map((pool, index) => (
              <Card key={`card-${pool.poolAddress}-${index}`} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={poolHref(pool.poolAddress)}
                    className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
                  >
                    {pool.pairLabel}
                  </Link>
                  {pool.topPick && <Badge tone="gold">★ Top pick</Badge>}
                </div>

                <dl className="flex flex-col divide-y divide-border/60">
                  {ROWS.map((row) => {
                    const isBest = (bestByRow.get(row.key) ?? null) === index;
                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-4 py-2"
                      >
                        <dt className="text-xs text-muted">{row.label}</dt>
                        <dd
                          className={cn(
                            "text-right text-sm",
                            isBest ? "font-semibold text-gold" : "text-foreground/90",
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {row.render(pool)}
                            {isBest && <span className="text-xs text-gold">★</span>}
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
