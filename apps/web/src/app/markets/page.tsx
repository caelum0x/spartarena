"use client";

import { useMemo } from "react";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { MarketPoolRow } from "@/components/markets/MarketPoolRow";
import { MarketTokenRow } from "@/components/markets/MarketTokenRow";
import { MoverRow } from "@/components/markets/MoverRow";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { formatUsd } from "@/lib/format";
import type { ByrealPoolView, ByrealTokenView } from "@/types";

/** Section heading shared across the Markets dashboard. */
function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export default function MarketsPage() {
  const pools = useByrealPools();
  const tokens = useByrealTokens();

  const poolList: readonly ByrealPoolView[] = pools.data?.data ?? [];
  const tokenList: readonly ByrealTokenView[] = tokens.data?.data ?? [];

  const totals = useMemo(() => {
    const totalTvl = poolList.reduce((sum, p) => sum + p.tvlUsd, 0);
    const totalVolume = poolList.reduce((sum, p) => sum + p.volume24hUsd, 0);
    const riskScores = poolList
      .map((p) => p.riskScore)
      .filter((r): r is number => r !== undefined);
    const avgRisk =
      riskScores.length > 0
        ? riskScores.reduce((sum, r) => sum + r, 0) / riskScores.length
        : null;
    return {
      totalTvl,
      totalVolume,
      poolCount: poolList.length,
      tokenCount: tokenList.length,
      avgRisk,
    };
  }, [poolList, tokenList]);

  const topPoolsByApr = useMemo(
    () => [...poolList].sort((a, b) => b.estimatedAprPct - a.estimatedAprPct).slice(0, 5),
    [poolList],
  );

  const topTokensByVolume = useMemo(
    () => [...tokenList].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, 5),
    [tokenList],
  );

  const { gainers, losers } = useMemo(() => {
    const moved = tokenList.filter((t) => t.priceChange24hPct !== 0);
    const byChangeDesc = [...moved].sort((a, b) => b.priceChange24hPct - a.priceChange24hPct);
    return {
      gainers: byChangeDesc.filter((t) => t.priceChange24hPct > 0).slice(0, 3),
      losers: byChangeDesc
        .filter((t) => t.priceChange24hPct < 0)
        .slice(-3)
        .reverse(),
    };
  }, [tokenList]);

  const isLoading = pools.isLoading || tokens.isLoading;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Markets"
        title="Markets Dashboard"
        description="A live, aggregated view of the real Byreal (Solana) market — pool liquidity and APR alongside trending tokens, ranked by the ByrealPoolAnalyst Spartan. TVL, volume, price and risk update on a gentle interval. Reads are wired for real, no mock data."
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Pool TVL" value={formatUsd(totals.totalTvl)} hint="Sum across pools" />
              <Stat
                label="24h Volume"
                value={formatUsd(totals.totalVolume)}
                hint="Sum across pools"
              />
              <Stat label="Pools" value={String(totals.poolCount)} />
              <Stat label="Tokens" value={String(totals.tokenCount)} />
              <Stat
                label="Avg Pool Risk"
                value={totals.avgRisk !== null ? String(Math.round(totals.avgRisk)) : "—"}
                hint="0–100, higher is riskier"
              />
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <SectionHeading title="Top pools by APR" hint="Top 5" />
              {topPoolsByApr.length === 0 ? (
                <Card className="p-6 text-center text-muted">No Byreal pools available.</Card>
              ) : (
                <div className="space-y-3">
                  {topPoolsByApr.map((pool) => (
                    <MarketPoolRow key={pool.poolAddress} pool={pool} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeading title="Top tokens by volume" hint="Top 5" />
              {topTokensByVolume.length === 0 ? (
                <Card className="p-6 text-center text-muted">No Byreal tokens available.</Card>
              ) : (
                <div className="space-y-3">
                  {topTokensByVolume.map((token) => (
                    <MarketTokenRow key={token.mint} token={token} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <section>
            <SectionHeading title="Biggest movers" hint="24h price change" />
            {gainers.length === 0 && losers.length === 0 ? (
              <Card className="p-6 text-center text-muted">
                No token price movement to report.
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-success">
                    Top gainers
                  </p>
                  {gainers.length === 0 ? (
                    <Card className="p-4 text-center text-sm text-muted">No gainers.</Card>
                  ) : (
                    <div className="space-y-2">
                      {gainers.map((token) => (
                        <MoverRow key={token.mint} token={token} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-crimson-soft">
                    Top losers
                  </p>
                  {losers.length === 0 ? (
                    <Card className="p-4 text-center text-sm text-muted">No losers.</Card>
                  ) : (
                    <div className="space-y-2">
                      {losers.map((token) => (
                        <MoverRow key={token.mint} token={token} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}
