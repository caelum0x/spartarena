"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { HashViewer } from "@/components/decisions/HashViewer";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealPoolView, ByrealTokenView } from "@/types";

/** Risk-adjusted yield score used to rank pools (APR discounted by risk). */
function riskAdjustedScore(pool: ByrealPoolView): number {
  return pool.estimatedAprPct * (1 - (pool.riskScore ?? 50) / 100);
}

/** Token discovery score used as the fallback ranking for the top-token pick. */
function tokenScore(token: ByrealTokenView): number {
  return token.liquidityScore - token.riskScore;
}

/** Tone for a 0–100 risk score, matching the Byreal pool pages. */
function riskTone(riskScore: number | undefined): "muted" | "crimson" | "gold" | "success" {
  if (riskScore === undefined) return "muted";
  if (riskScore >= 60) return "crimson";
  if (riskScore >= 30) return "gold";
  return "success";
}

/** Gold accent header label shared by every briefing card. */
function CardLabel({ children }: { children: string }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{children}</p>
  );
}

/** A one-line analyst takeaway derived from the underlying data. */
function AnalystLine({ children }: { children: string }) {
  return (
    <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-foreground/80">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      {children}
    </p>
  );
}

export default function ByrealInsightsPage() {
  const pools = useByrealPools();
  const tokens = useByrealTokens();

  const poolList: readonly ByrealPoolView[] = pools.data?.data ?? [];
  const tokenList: readonly ByrealTokenView[] = tokens.data?.data ?? [];

  const topPool = useMemo<ByrealPoolView | null>(() => {
    if (poolList.length === 0) return null;
    const flagged = poolList.find((p) => p.topPick === true);
    if (flagged) return flagged;
    return [...poolList].sort((a, b) => riskAdjustedScore(b) - riskAdjustedScore(a))[0] ?? null;
  }, [poolList]);

  const topToken = useMemo<ByrealTokenView | null>(() => {
    if (tokenList.length === 0) return null;
    const flagged = tokenList.find((t) => t.topPick === true);
    if (flagged) return flagged;
    return [...tokenList].sort((a, b) => tokenScore(b) - tokenScore(a))[0] ?? null;
  }, [tokenList]);

  const bestYield = useMemo<ByrealPoolView | null>(() => {
    if (poolList.length === 0) return null;
    return [...poolList].sort((a, b) => riskAdjustedScore(b) - riskAdjustedScore(a))[0] ?? null;
  }, [poolList]);

  const biggestMover = useMemo<ByrealTokenView | null>(() => {
    const moved = tokenList.filter((t) => t.priceChange24hPct !== 0);
    if (moved.length === 0) return null;
    return [...moved].sort(
      (a, b) => Math.abs(b.priceChange24hPct) - Math.abs(a.priceChange24hPct),
    )[0] ?? null;
  }, [tokenList]);

  const isLoading = pools.isLoading || tokens.isLoading;
  const hasSignals = poolList.length > 0 || tokenList.length > 0;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Analyst Briefing"
        description="The ByrealPoolAnalyst Spartan's live read on the real Byreal (Solana) markets — the few signals that matter right now, each one a proof-backed call you can verify and reproduce."
      />

      <ByrealTabs />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !hasSignals ? (
        <Card className="p-10 text-center">
          <p className="font-display text-lg font-semibold text-foreground">
            No live Byreal signals right now
          </p>
          <p className="mt-2 text-sm text-muted">
            The analyst has nothing proof-worthy to report at this moment. Check back as Solana
            liquidity moves.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* 1. Top pool pick */}
            <Card glow={Boolean(topPool)} className={cn(topPool && "border-gold/40")}>
              <CardLabel>Top pool pick</CardLabel>
              {topPool ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/byreal/pools/${topPool.poolAddress}`}
                      className="font-display text-xl font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {topPool.pairLabel}
                    </Link>
                    {topPool.riskScore !== undefined && (
                      <Badge tone={riskTone(topPool.riskScore)}>
                        Risk {Math.round(topPool.riskScore)}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Stat label="TVL" value={formatUsd(topPool.tvlUsd)} />
                    <Stat label="Est. APR" value={pct1(topPool.estimatedAprPct)} />
                  </div>

                  <AnalystLine>
                    {`The analyst's highest-conviction pool: ${topPool.pairLabel} pairs ${pct1(
                      topPool.estimatedAprPct,
                    )} APR with ${formatUsd(topPool.tvlUsd)} of liquidity${
                      topPool.riskScore !== undefined
                        ? ` at a ${Math.round(topPool.riskScore)}/100 risk read`
                        : ""
                    }.`}
                  </AnalystLine>

                  {topPool.proof && (
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          ByrealPoolAnalyst Proof
                        </p>
                        {topPool.proof.recordedOnMantle && (
                          <Badge tone="gold">Recorded on Mantle</Badge>
                        )}
                      </div>
                      <HashViewer label="Decision proof" hash={topPool.proof.toolProofHash} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">No pools to rank right now.</p>
              )}
            </Card>

            {/* 2. Top token pick */}
            <Card glow={Boolean(topToken)} className={cn(topToken && "border-gold/40")}>
              <CardLabel>Top token pick</CardLabel>
              {topToken ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/byreal/tokens/${topToken.mint}`}
                      className="font-display text-xl font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {topToken.symbol}
                    </Link>
                    <Badge tone={riskTone(topToken.riskScore)}>
                      Risk {Math.round(topToken.riskScore)}
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <Stat
                      label="Price"
                      value={topToken.priceUsd !== null ? formatUsd(topToken.priceUsd) : "—"}
                    />
                    <Stat
                      label="24h"
                      value={
                        <span
                          className={cn(
                            topToken.priceChange24hPct >= 0 ? "text-success" : "text-crimson-soft",
                          )}
                        >
                          {`${topToken.priceChange24hPct >= 0 ? "+" : ""}${pct1(
                            topToken.priceChange24hPct,
                          )}`}
                        </span>
                      }
                    />
                    <Stat label="Volume" value={formatUsd(topToken.volume24hUsd)} />
                  </div>

                  <AnalystLine>
                    {`${topToken.symbol} leads on risk-adjusted quality — a ${Math.round(
                      topToken.liquidityScore,
                    )}/100 liquidity read against ${Math.round(
                      topToken.riskScore,
                    )}/100 risk on ${formatUsd(topToken.volume24hUsd)} of 24h flow.`}
                  </AnalystLine>

                  {topToken.proof && (
                    <div className="mt-5 border-t border-border pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          ByrealPoolAnalyst Proof
                        </p>
                        {topToken.proof.recordedOnMantle && (
                          <Badge tone="gold">Recorded on Mantle</Badge>
                        )}
                      </div>
                      <HashViewer label="Discovery proof" hash={topToken.proof.toolProofHash} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">No tokens to rank right now.</p>
              )}
            </Card>

            {/* 3. Best yield */}
            <Card>
              <CardLabel>Best yield</CardLabel>
              {bestYield ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/byreal/pools/${bestYield.poolAddress}`}
                      className="font-display text-xl font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {bestYield.pairLabel}
                    </Link>
                    <Badge tone="gold">
                      Score {riskAdjustedScore(bestYield).toFixed(1)}
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Stat label="Est. APR" value={pct1(bestYield.estimatedAprPct)} />
                    <Stat label="TVL" value={formatUsd(bestYield.tvlUsd)} />
                  </div>

                  <AnalystLine>
                    {`Best risk-adjusted yield on the board: ${pct1(
                      bestYield.estimatedAprPct,
                    )} APR discounts to a ${riskAdjustedScore(bestYield).toFixed(
                      1,
                    )} score once risk is priced in.`}
                  </AnalystLine>
                </>
              ) : (
                <p className="text-sm text-muted">No yield signals right now.</p>
              )}
            </Card>

            {/* 4. Biggest 24h mover */}
            <Card>
              <CardLabel>Biggest 24h mover</CardLabel>
              {biggestMover ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/byreal/tokens/${biggestMover.mint}`}
                      className="font-display text-xl font-semibold text-foreground transition-colors hover:text-gold"
                    >
                      {biggestMover.symbol}
                    </Link>
                    <Badge
                      tone={biggestMover.priceChange24hPct >= 0 ? "success" : "crimson"}
                    >
                      {`${biggestMover.priceChange24hPct >= 0 ? "+" : ""}${pct1(
                        biggestMover.priceChange24hPct,
                      )}`}
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Stat
                      label="Price"
                      value={
                        biggestMover.priceUsd !== null ? formatUsd(biggestMover.priceUsd) : "—"
                      }
                    />
                    <Stat label="Volume" value={formatUsd(biggestMover.volume24hUsd)} />
                  </div>

                  <AnalystLine>
                    {`Sharpest 24h move on Byreal: ${biggestMover.symbol} is ${
                      biggestMover.priceChange24hPct >= 0 ? "up" : "down"
                    } ${pct1(Math.abs(biggestMover.priceChange24hPct))} on ${formatUsd(
                      biggestMover.volume24hUsd,
                    )} of volume.`}
                  </AnalystLine>
                </>
              ) : (
                <p className="text-sm text-muted">No notable price moves right now.</p>
              )}
            </Card>
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            Every analysis is a keccak256 decision-proof — verifiable and reproducible.
          </p>
        </>
      )}
    </Container>
  );
}
