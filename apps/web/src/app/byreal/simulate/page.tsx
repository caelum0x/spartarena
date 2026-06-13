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

/** "volume" uses real 24h volume × fee bps; "apr" falls back to the pool's estimated APR. */
type FeeMethod = "volume" | "apr";

interface Projection {
  readonly poolSharePct: number;
  readonly dailyFeesUsd: number;
  readonly monthlyFeesUsd: number;
  readonly annualFeesUsd: number;
  readonly effectiveAprPct: number;
  readonly method: FeeMethod;
}

/** Risk Badge tone matching the rest of the Byreal boards: crimson ≥60, gold ≥30, else success. */
function riskTone(score: number): "crimson" | "gold" | "success" {
  if (score >= 60) return "crimson";
  if (score >= 30) return "gold";
  return "success";
}

function riskNote(score: number): string {
  if (score >= 60)
    return "High risk: this pool's analysis flags elevated risk. Volume and APR can swing sharply, and a volatile pair exposes you to material impermanent loss — fee income may not offset it.";
  if (score >= 30)
    return "Moderate risk: APR and volume vary day to day. If the pair's price diverges you may take some impermanent loss against simply holding the two tokens.";
  return "Lower risk: this pair looks relatively stable, but all projections assume 24h volume and fees persist. Returns are never guaranteed and impermanent loss is still possible.";
}

/** Pure projection of LP fee earnings from real pool data and a USD deposit. */
function project(pool: ByrealPoolView, deposit: number): Projection {
  const poolShare = deposit / (pool.tvlUsd + deposit); // 0..1, guards div-by-zero via +deposit
  const hasFeeBps = typeof pool.feeBps === "number" && pool.feeBps > 0;

  // Prefer the real volume-based number when the pool reports a fee tier; otherwise
  // derive the daily figure from the pool's estimated APR on the deposit.
  const dailyFeesUsd = hasFeeBps
    ? pool.volume24hUsd * ((pool.feeBps as number) / 10000) * poolShare
    : (deposit * (pool.estimatedAprPct / 100)) / 365;

  const monthlyFeesUsd = dailyFeesUsd * 30;
  const annualFeesUsd = dailyFeesUsd * 365;
  const effectiveAprPct = deposit > 0 ? (annualFeesUsd / deposit) * 100 : 0;

  return {
    poolSharePct: poolShare * 100,
    dailyFeesUsd,
    monthlyFeesUsd,
    annualFeesUsd,
    effectiveAprPct,
    method: hasFeeBps ? "volume" : "apr",
  };
}

/** Compact USD with cent precision for small fee figures (formatUsd is compact/whole). */
function formatUsdPrecise(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ByrealSimulatePage() {
  const { data, isLoading, isError } = useByrealPools();
  const pools = useMemo(() => data?.data ?? [], [data]);

  // Default to the backend's top pick, else the deepest pool by TVL.
  const defaultAddress = useMemo(() => {
    if (pools.length === 0) return "";
    const pick = pools.find((p) => p.topPick);
    if (pick) return pick.poolAddress;
    return pools.reduce((best, p) => (p.tvlUsd > best.tvlUsd ? p : best), pools[0]!).poolAddress;
  }, [pools]);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [depositInput, setDepositInput] = useState("1000");

  const activeAddress = selectedAddress || defaultAddress;
  const pool = useMemo(
    () => pools.find((p) => p.poolAddress === activeAddress),
    [pools, activeAddress],
  );

  const depositValid = /^\d*\.?\d+$/.test(depositInput) && Number.parseFloat(depositInput) > 0;
  const deposit = depositValid ? Number.parseFloat(depositInput) : 0;

  const projection = useMemo(
    () => (pool && depositValid ? project(pool, deposit) : null),
    [pool, deposit, depositValid],
  );

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="LP Fee Simulator"
        description="Estimate the fees you'd earn by providing liquidity to a real Byreal (Solana) pool, based on its actual TVL, 24h volume and fee tier. These are estimates only — APR and volume vary constantly, and volatile pairs carry impermanent-loss risk."
      />

      <ByrealTabs />

      {isError ? (
        <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
          Could not load Byreal pools to simulate.
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
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <Card className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Pool
              </label>
              <select
                className={SELECT_CLASS}
                value={activeAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                aria-label="Pool"
              >
                {pools.map((p) => (
                  <option key={p.poolAddress} value={p.poolAddress}>
                    {p.pairLabel}
                    {p.topPick ? " ★" : ""} — {formatUsd(p.tvlUsd)} TVL
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

            {pool && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold text-foreground">
                    {pool.pairLabel}
                  </span>
                  {typeof pool.riskScore === "number" && (
                    <Badge tone={riskTone(pool.riskScore)}>
                      Risk {Math.round(pool.riskScore)}/100
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
                  <Stat label="24h volume" value={formatUsd(pool.volume24hUsd)} />
                  <Stat
                    label="Fee tier"
                    value={
                      typeof pool.feeBps === "number"
                        ? `${pool.feeBps} bps`
                        : "—"
                    }
                  />
                  <Stat label="Est. APR" value={pct1(pool.estimatedAprPct)} />
                </div>
                <Link
                  href={`/byreal/pools/${pool.poolAddress}`}
                  className="text-sm font-medium text-gold transition-colors hover:text-gold/80"
                >
                  View pool detail →
                </Link>
              </div>
            )}
          </Card>

          {/* Results */}
          <div>
            {!pool ? (
              <Card className="flex h-full items-center justify-center text-center text-muted">
                Select a pool to project LP fees.
              </Card>
            ) : !projection ? (
              <Card className="flex h-full items-center justify-center text-center text-muted">
                Enter a positive deposit amount to see projected fees.
              </Card>
            ) : (
              <Card className="flex flex-col gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted">Projected effective APR</p>
                  <p className="font-display text-3xl font-bold text-gradient-gold">
                    {pct1(projection.effectiveAprPct)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    on a {formatUsdPrecise(deposit)} deposit
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Pool share" value={pct1(projection.poolSharePct)} />
                  <Stat label="Daily fees" value={formatUsdPrecise(projection.dailyFeesUsd)} />
                  <Stat
                    label="Monthly fees (≈30d)"
                    value={formatUsdPrecise(projection.monthlyFeesUsd)}
                  />
                  <Stat
                    label="Annual fees (≈365d)"
                    value={formatUsdPrecise(projection.annualFeesUsd)}
                  />
                </div>

                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    "border-border bg-surface/50 text-muted",
                  )}
                >
                  {projection.method === "volume" ? (
                    <>
                      Method: <span className="text-foreground">volume-based</span> — your share of
                      real 24h volume × the pool&apos;s {pool.feeBps} bps fee.
                    </>
                  ) : (
                    <>
                      Method: <span className="text-foreground">APR-based fallback</span> — this
                      pool reports no fee tier, so figures derive from its estimated{" "}
                      {pct1(pool.estimatedAprPct)} APR.
                    </>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-foreground/80">
                  {riskNote(typeof pool.riskScore === "number" ? pool.riskScore : 30)}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
