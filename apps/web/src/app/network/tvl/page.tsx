"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { useMantleTvlHistory, type MantleTvlPoint } from "@/hooks/useMantleTvlHistory";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Selectable timeframes. `null` days means the full series ("All"). */
const TIMEFRAMES = [
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "180d", label: "180D", days: 180 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

interface WindowStats {
  readonly tvls: number[];
  readonly current: number | null;
  readonly first: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly changePct: number | null;
}

/** Slice the series to the last `days` points (or all) and derive its numbers. */
function computeWindow(series: MantleTvlPoint[], days: number | null): WindowStats {
  const sliced = days === null ? series : series.slice(-days);
  const tvls = sliced.map((p) => p.tvl);

  if (tvls.length === 0) {
    return { tvls, current: null, first: null, high: null, low: null, changePct: null };
  }

  const first = tvls[0] ?? null;
  const current = tvls[tvls.length - 1] ?? null;
  const high = Math.max(...tvls);
  const low = Math.min(...tvls);
  const changePct =
    first !== null && current !== null && first !== 0
      ? ((current - first) / first) * 100
      : null;

  return { tvls, current, first, high, low, changePct };
}

/** Renders a nullable USD value, falling back to an em dash. */
function usdOrDash(value: number | null): string {
  return value === null ? "—" : formatUsd(value);
}

/** Signed window-change badge, on-brand green / crimson. */
function ChangeBadge({ pctValue }: { pctValue: number }) {
  const positive = pctValue >= 0;
  return (
    <Badge tone={positive ? "success" : "crimson"}>
      {positive ? "+" : ""}
      {pctValue.toFixed(1)}%
    </Badge>
  );
}

export default function NetworkTvlPage() {
  const query = useMantleTvlHistory();
  const [timeframe, setTimeframe] = useState<TimeframeKey>("90d");

  // Wrap raw series access so the useMemo dep is a stable reference.
  const series = useMemo<MantleTvlPoint[]>(() => query.data ?? [], [query.data]);

  const days = useMemo(
    () => TIMEFRAMES.find((t) => t.key === timeframe)?.days ?? null,
    [timeframe],
  );

  const stats = useMemo(() => computeWindow(series, days), [series, days]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="TVL Trend"
        description="Mantle total value locked over time, sourced from DefiLlama."
      />

      <NetworkTabs />

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : query.isError ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle TVL history
          </p>
          <p className="mt-2 text-sm text-muted">
            The DefiLlama feed is temporarily unavailable. Please try again shortly.
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : series.length === 0 ? (
        <Card className="p-6">
          <p className="py-8 text-center text-sm text-muted">
            No TVL history is available for Mantle right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Timeframe toggle */}
          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map((tf) => {
              const active = tf.key === timeframe;
              return (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setTimeframe(tf.key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-gold/40 bg-gold/15 text-gold"
                      : "border-border bg-surface/60 text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <Card className="p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Current TVL</p>
                <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                  {usdOrDash(stats.current)}
                </p>
              </div>
              {stats.changePct !== null && (
                <div className="text-right">
                  <p className="mb-1 text-xs text-muted">
                    Change ({TIMEFRAMES.find((t) => t.key === timeframe)?.label})
                  </p>
                  <ChangeBadge pctValue={stats.changePct} />
                </div>
              )}
            </div>
            {stats.tvls.length >= 2 ? (
              <Sparkline data={stats.tvls} className="text-gold w-full" height={120} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                Not enough history to plot this window.
              </p>
            )}
          </Card>

          {/* Stat row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Current TVL"
              value={usdOrDash(stats.current)}
              hint="Most recent daily total value locked"
            />
            <Stat
              label="Window high"
              value={usdOrDash(stats.high)}
              hint="Peak TVL in the selected window"
            />
            <Stat
              label="Window low"
              value={usdOrDash(stats.low)}
              hint="Lowest TVL in the selected window"
            />
          </div>

          <p className="text-xs text-muted">
            Source:{" "}
            <Link
              href="https://defillama.com/chain/Mantle"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gold hover:underline"
            >
              DefiLlama
            </Link>
          </p>
        </div>
      )}
    </Container>
  );
}
