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

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

const MAX_LEGS = 6;
const MIN_LEGS = 1;
/** Neutral risk score used when a pool reports none. */
const NEUTRAL_RISK = 50;

/** A single portfolio allocation: which pool, and its raw (un-normalized) weight. */
interface Leg {
  readonly id: number;
  readonly poolAddress: string;
  readonly weightInput: string;
}

/** Risk Badge tone matching the rest of the Byreal boards: crimson ≥60, gold ≥30, else success. */
function riskTone(score: number): "crimson" | "gold" | "success" {
  if (score >= 60) return "crimson";
  if (score >= 30) return "gold";
  return "success";
}

/** Parse a weight input into a non-negative number; bad/empty input → 0. */
function parseWeight(value: string): number {
  if (!/^\d*\.?\d*$/.test(value.trim())) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface ComputedLeg {
  readonly leg: Leg;
  readonly pool: ByrealPoolView | undefined;
  readonly rawWeight: number;
  readonly normalizedPct: number;
  readonly allocationUsd: number;
  readonly estAnnualFees: number;
}

interface Portfolio {
  readonly legs: readonly ComputedLeg[];
  readonly capital: number;
  readonly blendedAprPct: number;
  readonly blendedRisk: number;
  readonly projectedAnnualUsd: number;
  readonly projectedMonthlyUsd: number;
}

/**
 * Pure portfolio math from real pool data, the legs, and total capital.
 * Weights are normalized to 100% so the math is invariant to how users enter them.
 */
function computePortfolio(
  legs: readonly Leg[],
  poolsByAddress: ReadonlyMap<string, ByrealPoolView>,
  capital: number,
): Portfolio {
  const withWeights = legs.map((leg) => ({
    leg,
    pool: poolsByAddress.get(leg.poolAddress),
    rawWeight: parseWeight(leg.weightInput),
  }));

  const totalWeight = withWeights.reduce((sum, l) => sum + l.rawWeight, 0);

  const computed: ComputedLeg[] = withWeights.map((l) => {
    const normalized = totalWeight > 0 ? l.rawWeight / totalWeight : 0;
    const allocationUsd = capital * normalized;
    const aprPct = l.pool?.estimatedAprPct ?? 0;
    return {
      leg: l.leg,
      pool: l.pool,
      rawWeight: l.rawWeight,
      normalizedPct: normalized * 100,
      allocationUsd,
      estAnnualFees: (allocationUsd * aprPct) / 100,
    };
  });

  const projectedAnnualUsd = computed.reduce((sum, c) => sum + c.estAnnualFees, 0);
  const blendedAprPct = capital > 0 ? (projectedAnnualUsd / capital) * 100 : 0;
  const blendedRisk = computed.reduce(
    (sum, c) => sum + (c.normalizedPct / 100) * (c.pool?.riskScore ?? NEUTRAL_RISK),
    0,
  );

  return {
    legs: computed,
    capital,
    blendedAprPct,
    blendedRisk,
    projectedAnnualUsd,
    projectedMonthlyUsd: projectedAnnualUsd / 12,
  };
}

/** One-line assessment derived from blended APR vs blended risk. */
function assessment(aprPct: number, risk: number): string {
  if (risk >= 60) {
    return aprPct >= 15
      ? "Aggressive high-yield mix — outsized APR carried by elevated-risk pools; size and impermanent loss demand caution."
      : "High-risk tilt without the yield to match — the risk budget isn't earning its keep.";
  }
  if (risk >= 30) {
    return aprPct >= 15
      ? "Balanced growth mix — strong blended APR at moderate, manageable risk."
      : "Steady, moderate-risk allocation — dependable yield without chasing the tail.";
  }
  return aprPct >= 10
    ? "Efficient low-risk mix — healthy yield from deep, stable pools."
    : "Conservative, capital-preservation tilt — low risk and modest, durable yield.";
}

let nextLegId = 0;
function makeLeg(poolAddress: string, weightInput: string): Leg {
  nextLegId += 1;
  return { id: nextLegId, poolAddress, weightInput };
}

export default function ByrealStrategyPage() {
  const { data, isLoading, isError } = useByrealPools();
  const pools = useMemo(() => data?.data ?? [], [data]);

  const poolsByAddress = useMemo(
    () => new Map(pools.map((p) => [p.poolAddress, p] as const)),
    [pools],
  );

  // Seed two legs from the two deepest pools at 50/50 once pools resolve.
  const seededLegs = useMemo<Leg[]>(() => {
    if (pools.length === 0) return [];
    const byTvl = [...pools].sort((a, b) => b.tvlUsd - a.tvlUsd);
    const first = byTvl[0]!;
    const second = byTvl[1] ?? first;
    return [makeLeg(first.poolAddress, "50"), makeLeg(second.poolAddress, "50")];
  }, [pools]);

  const [legs, setLegs] = useState<Leg[] | null>(null);
  const [capitalInput, setCapitalInput] = useState("10000");

  const activeLegs = legs ?? seededLegs;

  const capitalValid = /^\d*\.?\d+$/.test(capitalInput) && Number.parseFloat(capitalInput) > 0;
  const capital = capitalValid ? Number.parseFloat(capitalInput) : 0;

  const portfolio = useMemo(
    () => computePortfolio(activeLegs, poolsByAddress, capital),
    [activeLegs, poolsByAddress, capital],
  );

  function updateLeg(id: number, patch: Partial<Pick<Leg, "poolAddress" | "weightInput">>): void {
    setLegs(activeLegs.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)));
  }

  function addLeg(): void {
    if (activeLegs.length >= MAX_LEGS || pools.length === 0) return;
    const fallback = pools[0]!.poolAddress;
    setLegs([...activeLegs, makeLeg(fallback, "25")]);
  }

  function removeLeg(id: number): void {
    if (activeLegs.length <= MIN_LEGS) return;
    setLegs(activeLegs.filter((leg) => leg.id !== id));
  }

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Strategy Builder"
        description="Compose a multi-pool LP portfolio across real Byreal (Solana) pools, assign allocation weights, and see the blended APR, risk and projected yield. These are estimates only — APR and volume move constantly, and every LP position carries impermanent-loss risk."
      />

      <ByrealTabs />

      {isError ? (
        <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
          Could not load Byreal pools to build a strategy.
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : pools.length === 0 ? (
        <Card className="text-center text-muted">
          No Byreal pools are available right now. Check back once pool analysis has run.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Builder */}
          <div className="flex flex-col gap-5">
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="sm:max-w-xs">
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                    Total capital (USD)
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={capitalInput}
                    onChange={(e) => setCapitalInput(e.target.value)}
                    aria-label="Total capital in USD"
                    error={capitalValid ? undefined : "Enter a positive amount"}
                  />
                </div>
                <button
                  type="button"
                  onClick={addLeg}
                  disabled={activeLegs.length >= MAX_LEGS}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                    activeLegs.length >= MAX_LEGS
                      ? "cursor-not-allowed border-border bg-surface/40 text-muted/60"
                      : "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20",
                  )}
                >
                  + Add pool {activeLegs.length >= MAX_LEGS && `(max ${MAX_LEGS})`}
                </button>
              </div>
            </Card>

            {portfolio.legs.map((c) => {
              const risk = c.pool?.riskScore;
              return (
                <Card key={c.leg.id} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                        Pool
                      </label>
                      <select
                        className={SELECT_CLASS}
                        value={c.leg.poolAddress}
                        onChange={(e) => updateLeg(c.leg.id, { poolAddress: e.target.value })}
                        aria-label="Pool for this allocation leg"
                      >
                        {pools.map((p) => (
                          <option key={p.poolAddress} value={p.poolAddress}>
                            {p.pairLabel}
                            {p.topPick ? " ★" : ""} — {formatUsd(p.tvlUsd)} TVL
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:w-32">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                        Weight (%)
                      </label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={c.leg.weightInput}
                        onChange={(e) => updateLeg(c.leg.id, { weightInput: e.target.value })}
                        aria-label="Allocation weight in percent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLeg(c.leg.id)}
                      disabled={activeLegs.length <= MIN_LEGS}
                      className={cn(
                        "h-11 shrink-0 rounded-lg border px-3 text-sm font-medium transition-all",
                        activeLegs.length <= MIN_LEGS
                          ? "cursor-not-allowed border-border bg-surface/40 text-muted/50"
                          : "border-crimson/30 bg-crimson/5 text-crimson-soft hover:bg-crimson/10",
                      )}
                      aria-label="Remove this leg"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Badge tone="gold">{pct1(c.normalizedPct)} of book</Badge>
                    <Badge tone="info">{formatUsd(c.allocationUsd)} allocated</Badge>
                    {c.pool && (
                      <Badge tone="muted">APR {pct1(c.pool.estimatedAprPct)}</Badge>
                    )}
                    {typeof risk === "number" && (
                      <Badge tone={riskTone(risk)}>Risk {Math.round(risk)}/100</Badge>
                    )}
                    {c.pool && (
                      <Link
                        href={`/byreal/pools/${c.pool.poolAddress}`}
                        className="ml-auto text-sm font-medium text-gold transition-colors hover:text-gold/80"
                      >
                        View pool →
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <div>
            <Card className="flex flex-col gap-4 lg:sticky lg:top-6">
              <div className="text-center">
                <p className="text-sm text-muted">Blended APR</p>
                <p className="font-display text-4xl font-bold text-gradient-gold">
                  {pct1(portfolio.blendedAprPct)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  across {portfolio.legs.length} pool
                  {portfolio.legs.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center justify-center">
                <Badge tone={riskTone(portfolio.blendedRisk)}>
                  Blended risk {Math.round(portfolio.blendedRisk)}/100
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total capital" value={formatUsd(portfolio.capital)} />
                <Stat label="Blended APR" value={pct1(portfolio.blendedAprPct)} />
                <Stat
                  label="Projected annual yield"
                  value={formatUsd(portfolio.projectedAnnualUsd)}
                />
                <Stat
                  label="Projected monthly"
                  value={formatUsd(portfolio.projectedMonthlyUsd)}
                />
              </div>

              <p className="rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm leading-relaxed text-foreground/80">
                {capitalValid
                  ? assessment(portfolio.blendedAprPct, portfolio.blendedRisk)
                  : "Enter a positive capital amount to size the portfolio."}
              </p>

              <p className="text-xs leading-relaxed text-muted">
                Weights are normalized to 100%, so only their relative sizes matter. Blended APR is
                allocation-weighted by USD; blended risk is the allocation-weighted average of each
                pool&apos;s risk score (pools with no score count as {NEUTRAL_RISK}). Projections
                assume current APRs persist and ignore impermanent loss.
              </p>
            </Card>
          </div>
        </div>
      )}
    </Container>
  );
}
