"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealTokenView } from "@/types";

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;

/** A metric row in the comparison grid. */
interface MetricRow {
  readonly key: string;
  readonly label: string;
  /** Renders the cell value for a token. */
  readonly render: (token: ByrealTokenView) => React.ReactNode;
  /** Numeric value used to pick the best column, or null when not comparable. */
  readonly value: (token: ByrealTokenView) => number | null;
  /** Which extreme wins the gold highlight. */
  readonly best: "max" | "min";
}

function changeClass(pctValue: number): string {
  if (pctValue > 0) return "text-success";
  if (pctValue < 0) return "text-crimson-soft";
  return "text-muted";
}

const ROWS: readonly MetricRow[] = [
  {
    key: "price",
    label: "Price",
    render: (t) => (t.priceUsd === null ? <span className="text-muted">—</span> : formatUsd(t.priceUsd)),
    value: (t) => t.priceUsd,
    best: "max",
  },
  {
    key: "change",
    label: "24h change",
    render: (t) => (
      <span className={changeClass(t.priceChange24hPct)}>
        {t.priceChange24hPct > 0 ? "+" : ""}
        {pct1(t.priceChange24hPct)}
      </span>
    ),
    value: (t) => t.priceChange24hPct,
    best: "max",
  },
  {
    key: "volume",
    label: "24h volume",
    render: (t) => formatUsd(t.volume24hUsd),
    value: (t) => t.volume24hUsd,
    best: "max",
  },
  {
    key: "marketCap",
    label: "Market cap",
    render: (t) =>
      t.marketCapUsd === null ? <span className="text-muted">—</span> : formatUsd(t.marketCapUsd),
    value: (t) => t.marketCapUsd,
    best: "max",
  },
  {
    key: "liquidity",
    label: "Liquidity score",
    render: (t) => `${Math.round(t.liquidityScore)}/100`,
    value: (t) => t.liquidityScore,
    best: "max",
  },
  {
    key: "risk",
    label: "Risk score",
    render: (t) => `${Math.round(t.riskScore)}/100`,
    value: (t) => t.riskScore,
    best: "min",
  },
  {
    key: "reason",
    label: "Analyst note",
    render: (t) => <span className="text-foreground/80">{t.reason}</span>,
    value: () => null,
    best: "max",
  },
] as const;

/**
 * Index of the best (winning) column for a row, or null when no column wins
 * (non-comparable row, all values equal, or fewer than two comparable values).
 */
function bestColumnIndex(row: MetricRow, tokens: readonly ByrealTokenView[]): number | null {
  const values = tokens.map((t) => row.value(t));
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

function tokenHref(mint: string): string {
  return `/byreal/tokens/${mint}`;
}

export default function ByrealComparePage() {
  const { data, isLoading, isError, error } = useByrealTokens();
  const tokens = useMemo(() => data?.data ?? [], [data]);

  const byMint = useMemo(() => new Map(tokens.map((t) => [t.mint, t])), [tokens]);

  // Selected token mints, one per comparison column. Seeded once the real token
  // list loads with the two highest-volume tokens.
  const [selected, setSelected] = useState<readonly string[]>([]);

  useEffect(() => {
    if (selected.length > 0 || tokens.length < MIN_COLUMNS) return;
    const topByVolume = [...tokens]
      .sort((a, b) => b.volume24hUsd - a.volume24hUsd)
      .slice(0, MIN_COLUMNS)
      .map((t) => t.mint);
    setSelected(topByVolume);
  }, [tokens, selected.length]);

  const columns = useMemo(
    () => selected.map((mint) => byMint.get(mint)).filter((t): t is ByrealTokenView => t !== undefined),
    [selected, byMint],
  );

  const setColumn = (index: number, mint: string): void => {
    setSelected((prev) => prev.map((m, i) => (i === index ? mint : m)));
  };

  const addColumn = (): void => {
    setSelected((prev) => {
      if (prev.length >= MAX_COLUMNS) return prev;
      const used = new Set(prev);
      const next = tokens.find((t) => !used.has(t.mint));
      return next ? [...prev, next.mint] : prev;
    });
  };

  const removeColumn = (index: number): void => {
    setSelected((prev) => (prev.length <= MIN_COLUMNS ? prev : prev.filter((_, i) => i !== index)));
  };

  const bestByRow = useMemo(
    () => new Map(ROWS.map((row) => [row.key, bestColumnIndex(row, columns)])),
    [columns],
  );

  const gridTemplate = { gridTemplateColumns: `minmax(8rem,11rem) repeat(${columns.length}, minmax(0,1fr))` };

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Compare Tokens"
        description="Put 2–4 Byreal (Solana) tokens head to head — real price, 24h move and volume, market cap, plus the ByrealPoolAnalyst's blended liquidity and risk scores. The strongest value in each row is flagged in gold. Reads are wired for real."
      />

      <ByrealTabs />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal tokens to compare.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </div>
      ) : tokens.length < MIN_COLUMNS ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          At least two Byreal tokens are needed to compare. Only {tokens.length} loaded.
        </div>
      ) : (
        <>
          {/* Column pickers */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map((token, index) => (
              <div key={`picker-${index}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted">
                    Token {index + 1}
                  </label>
                  {selected.length > MIN_COLUMNS && (
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      aria-label={`Remove token ${index + 1}`}
                      className="text-xs text-muted transition-colors hover:text-crimson-soft"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <select
                  className={SELECT_CLASS}
                  value={token.mint}
                  onChange={(e) => setColumn(index, e.target.value)}
                  aria-label={`Select token ${index + 1}`}
                >
                  {tokens.map((t) => (
                    <option key={t.mint} value={t.mint}>
                      {t.symbol} — {t.name}
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
                + Add token
              </button>
            )}
          </div>

          {/* lg+: comparison grid */}
          <Card className="hidden overflow-x-auto p-0 lg:block">
            <div className="min-w-full">
              {/* Header row: symbols link to token detail */}
              <div
                className="grid items-stretch border-b border-border"
                style={gridTemplate}
              >
                <div className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted">
                  Metric
                </div>
                {columns.map((token, index) => (
                  <div key={`head-${token.mint}-${index}`} className="border-l border-border px-5 py-4">
                    <Link
                      href={tokenHref(token.mint)}
                      className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {token.symbol}
                    </Link>
                    <p className="truncate text-xs text-muted">{token.name}</p>
                    {token.topPick && (
                      <Badge tone="gold" className="mt-1.5">
                        Top pick
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
                    {columns.map((token, index) => {
                      const isBest = bestIdx === index;
                      return (
                        <div
                          key={`${row.key}-${token.mint}-${index}`}
                          className={cn(
                            "border-l border-border px-5 py-4 text-sm",
                            isBest ? "bg-gold/10 font-semibold text-foreground" : "text-foreground/90",
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {row.render(token)}
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

          {/* < lg: stacked cards, one per token */}
          <div className="grid gap-5 sm:grid-cols-2 lg:hidden">
            {columns.map((token, index) => (
              <Card key={`card-${token.mint}-${index}`} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={tokenHref(token.mint)}
                      className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {token.symbol}
                    </Link>
                    <p className="truncate text-xs text-muted">{token.name}</p>
                  </div>
                  {token.topPick && <Badge tone="gold">Top pick</Badge>}
                </div>

                <dl className="flex flex-col divide-y divide-border/60">
                  {ROWS.map((row) => {
                    const isBest = (bestByRow.get(row.key) ?? null) === index;
                    return (
                      <div key={row.key} className="flex items-center justify-between gap-4 py-2">
                        <dt className="text-xs text-muted">{row.label}</dt>
                        <dd
                          className={cn(
                            "text-right text-sm",
                            isBest ? "font-semibold text-gold" : "text-foreground/90",
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {row.render(token)}
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
