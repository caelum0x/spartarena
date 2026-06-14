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
import { Sparkline } from "@/components/ui/Sparkline";
import { useMantleYields, type MantleYieldPool } from "@/hooks/useMantleYields";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

/** Minimum TVL (USD) a pool needs to be the sensible default selection. */
const DEFAULT_MIN_TVL = 100_000;

/** Number of points sampled across [0, years] for the growth Sparkline. */
const GROWTH_SAMPLES = 24;

/** Capitalize a protocol slug for display ("aave" → "Aave"). */
function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface HorizonPreset {
  readonly label: string;
  readonly years: number;
}

const HORIZONS: readonly HorizonPreset[] = [
  { label: "1m", years: 1 / 12 },
  { label: "3m", years: 3 / 12 },
  { label: "6m", years: 6 / 12 },
  { label: "1y", years: 1 },
  { label: "3y", years: 3 },
];

interface CompoundOption {
  readonly label: string;
  readonly n: number;
}

const COMPOUNDING: readonly CompoundOption[] = [
  { label: "Daily", n: 365 },
  { label: "Monthly", n: 12 },
  { label: "Annually", n: 1 },
];

interface Projection {
  readonly futureValue: number;
  readonly earnings: number;
  readonly multiple: number;
  readonly growth: number[];
}

/**
 * Pure compound-growth projection from a real pool APY, a USD principal, a time
 * horizon in years, and a compounding frequency `n`.
 * FV = principal · (1 + apy/100 / n)^(n · years).
 */
function project(apyPct: number, principal: number, years: number, n: number): Projection {
  const rate = apyPct / 100 / n;
  const valueAt = (t: number): number => principal * Math.pow(1 + rate, n * t);

  const futureValue = valueAt(years);
  const earnings = futureValue - principal;
  const multiple = principal > 0 ? futureValue / principal : 0;

  const growth: number[] = [];
  for (let i = 0; i <= GROWTH_SAMPLES; i += 1) {
    const t = (years * i) / GROWTH_SAMPLES;
    growth.push(valueAt(t));
  }

  return { futureValue, earnings, multiple, growth };
}

export default function YieldCalculatorPage() {
  const { data, isLoading, isError, error } = useMantleYields();
  const pools = useMemo<readonly MantleYieldPool[]>(() => data ?? [], [data]);

  // Default to the highest-APY pool with meaningful TVL. Pools arrive sorted by
  // APY desc, so the first qualifying pool is the highest. Fall back to the very
  // first pool if none clear the TVL bar.
  const defaultPoolId = useMemo(() => {
    if (pools.length === 0) return "";
    const liquid = pools.find((p) => p.tvlUsd >= DEFAULT_MIN_TVL);
    return (liquid ?? pools[0]!).id;
  }, [pools]);

  const [selectedId, setSelectedId] = useState("");
  const [depositInput, setDepositInput] = useState("1000");
  const [years, setYears] = useState(1);
  const [compoundN, setCompoundN] = useState(365);

  const activeId = selectedId || defaultPoolId;
  const pool = useMemo(() => pools.find((p) => p.id === activeId), [pools, activeId]);

  const depositValid = /^\d*\.?\d+$/.test(depositInput) && Number.parseFloat(depositInput) > 0;
  const deposit = depositValid ? Number.parseFloat(depositInput) : 0;

  const projection = useMemo<Projection | null>(
    () => (pool && depositValid ? project(pool.apy, deposit, years, compoundN) : null),
    [pool, depositValid, deposit, years, compoundN],
  );

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Yield Calculator"
        description="Project compounded returns from real Mantle yield opportunities, aggregated from DefiLlama. These are estimates only — APYs vary constantly with market conditions and rewards, and projected growth assumes the current APY holds for the full horizon."
      />

      <NetworkTabs />

      {isError ? (
        <Card className="border-crimson/30 bg-crimson/5 p-10 text-center">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle yield opportunities.
          </p>
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : pools.length === 0 ? (
        <Card className="border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          No Mantle yield pools are available right now. Check back once the yields feed refreshes.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Controls */}
          <Card className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Yield pool
              </label>
              <select
                className={SELECT_CLASS}
                value={activeId}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Yield pool"
              >
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {capitalize(p.project)} · {p.symbol} · {pct1(p.apy)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Deposit amount (USD)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                aria-label="Deposit amount in USD"
                error={depositValid ? undefined : "Enter a positive amount"}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Time horizon
              </label>
              <div className="flex flex-wrap gap-2">
                {HORIZONS.map((h) => (
                  <button
                    key={h.label}
                    type="button"
                    onClick={() => setYears(h.years)}
                    aria-pressed={years === h.years}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                      years === h.years
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-surface/50 text-muted hover:text-foreground",
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Compounding
              </label>
              <select
                className={SELECT_CLASS}
                value={compoundN}
                onChange={(e) => setCompoundN(Number.parseInt(e.target.value, 10))}
                aria-label="Compounding frequency"
              >
                {COMPOUNDING.map((c) => (
                  <option key={c.n} value={c.n}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {pool && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-semibold text-foreground">
                    {capitalize(pool.project)}{" "}
                    <span className="font-mono text-sm text-foreground/70">{pool.symbol}</span>
                  </span>
                  <span className="font-display text-2xl font-bold text-gold">{pct1(pool.apy)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pool.stablecoin && <Badge tone="success">Stablecoin</Badge>}
                  {pool.ilRisk === "no" ? (
                    <Badge tone="info">No IL risk</Badge>
                  ) : pool.ilRisk === "yes" ? (
                    <Badge tone="crimson">IL risk</Badge>
                  ) : null}
                  {pool.exposure && <Badge tone="muted">{capitalize(pool.exposure)}</Badge>}
                  {pool.poolMeta && <Badge tone="muted">{pool.poolMeta}</Badge>}
                </div>
                <Stat label="Pool TVL" value={formatUsd(pool.tvlUsd)} />
                <Link
                  href="/network/yields"
                  className="text-sm font-medium text-gold transition-colors hover:text-gold/80"
                >
                  View all Mantle yields →
                </Link>
              </div>
            )}
          </Card>

          {/* Results */}
          <div className="flex flex-col gap-6">
            {!projection || !pool ? (
              <Card className="flex h-full items-center justify-center text-center text-muted">
                Enter a positive deposit amount to project compounded returns.
              </Card>
            ) : (
              <>
                <Card className="flex flex-col gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted">Projected value</p>
                    <p className="font-display text-4xl font-bold text-gradient-gold">
                      {formatUsd(projection.futureValue)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      from {formatUsd(deposit)} over{" "}
                      {HORIZONS.find((h) => h.years === years)?.label ?? `${years}y`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Projected value" value={formatUsd(projection.futureValue)} />
                    <Stat label="Total earnings" value={formatUsd(projection.earnings)} />
                    <Stat
                      label="Effective multiple"
                      value={`${projection.multiple.toFixed(2)}×`}
                    />
                    <Stat
                      label="Pool APY"
                      value={<span className="text-gold">{pct1(pool.apy)}</span>}
                    />
                  </div>

                  <p className="text-xs leading-relaxed text-muted">
                    {pool.stablecoin
                      ? "This is a stablecoin pool, so principal price risk is limited — but APY and rewards still fluctuate."
                      : pool.ilRisk === "yes"
                        ? "This pool carries impermanent-loss risk: if the paired assets diverge in price, realized returns can fall well below this projection."
                        : "Returns are never guaranteed. This projection assumes the current APY holds for the full horizon."}
                  </p>
                </Card>

                <Card className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-wider text-muted">Projected growth</p>
                  <Sparkline data={projection.growth} className="w-full text-gold" height={72} />
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{formatUsd(deposit)}</span>
                    <span>{formatUsd(projection.futureValue)}</span>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
