"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Sparkline } from "@/components/ui/Sparkline";
import { MarketPoolRow } from "@/components/markets/MarketPoolRow";
import { MarketTokenRow } from "@/components/markets/MarketTokenRow";
import { MoverRow } from "@/components/markets/MoverRow";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { useMantleDefi } from "@/hooks/useMantleDefi";
import { useMantleDexs } from "@/hooks/useMantleDexs";
import { useMantleYields } from "@/hooks/useMantleYields";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
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
  const defi = useMantleDefi();
  const dexs = useMantleDexs();
  const yields = useMantleYields();

  const poolData = pools.data;
  const tokenData = tokens.data;
  const poolList = useMemo<readonly ByrealPoolView[]>(() => poolData?.data ?? [], [poolData]);
  const tokenList = useMemo<readonly ByrealTokenView[]>(() => tokenData?.data ?? [], [tokenData]);

  const topDexs = useMemo(
    () =>
      [...(dexs.data?.dexs ?? [])]
        .sort((a, b) => (b.vol24h ?? 0) - (a.vol24h ?? 0))
        .slice(0, 4),
    [dexs.data],
  );

  const topYields = useMemo(() => (yields.data ?? []).slice(0, 4), [yields.data]);

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

      <section className="mb-12">
        <SectionHeading title="Mantle DeFi" hint="Live DefiLlama snapshot" />
        <Card className="p-6">
          {defi.isLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Spinner className="h-5 w-5" />
              Loading Mantle DeFi snapshot…
            </div>
          ) : (
            (() => {
              const data = defi.data;
              const change = data?.tvlChange30dPct ?? null;
              const history = data?.tvlHistory ?? [];
              const changeUp = change !== null && change >= 0;
              return (
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="grid flex-1 gap-4 sm:grid-cols-2">
                    <Stat
                      label="Mantle TVL"
                      value={
                        <span className="flex items-baseline gap-2">
                          {data?.tvlUsd != null ? formatUsd(data.tvlUsd) : "—"}
                          {change !== null && (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                changeUp ? "text-success" : "text-crimson-soft",
                              )}
                            >
                              {changeUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                            </span>
                          )}
                        </span>
                      }
                      hint="30d change vs. now"
                    />
                    <Stat
                      label="Stablecoins"
                      value={data?.stablecoinsUsd != null ? formatUsd(data.stablecoinsUsd) : "—"}
                      hint="Circulating on Mantle"
                    />
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    {history.length >= 2 ? (
                      <Sparkline data={history} className="text-gold" height={40} />
                    ) : (
                      <span className="text-xs text-muted">No TVL history available</span>
                    )}
                    <Link
                      href="/network/defi"
                      className="text-sm font-semibold text-gold transition-colors hover:text-gold/80"
                    >
                      View Mantle DeFi →
                    </Link>
                  </div>
                </div>
              );
            })()
          )}
        </Card>
      </section>

      <div className="mb-12 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading title="Top Mantle DEXs" hint="By 24h volume" />
          <Card className="p-6">
            {dexs.isLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted">
                <Spinner className="h-5 w-5" />
                Loading DEX volumes…
              </div>
            ) : dexs.isError || topDexs.length === 0 ? (
              <p className="text-sm text-muted">DEX volumes unavailable right now.</p>
            ) : (
              <div className="space-y-3">
                {topDexs.map((dex) => {
                  const change = dex.change7dOver7d;
                  const changeUp = change !== null && change >= 0;
                  return (
                    <div
                      key={dex.name}
                      className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-semibold text-foreground">{dex.name}</span>
                      <span className="flex items-baseline gap-2 text-sm">
                        <span className="text-muted">
                          {dex.vol24h != null ? formatUsd(dex.vol24h) : "—"}
                        </span>
                        {change !== null && (
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              changeUp ? "text-success" : "text-crimson-soft",
                            )}
                          >
                            {changeUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <Link
                  href="/network/dexs"
                  className="inline-block pt-1 text-sm font-semibold text-gold transition-colors hover:text-gold/80"
                >
                  All DEXs →
                </Link>
              </div>
            )}
          </Card>
        </section>

        <section>
          <SectionHeading title="Top Mantle yields" hint="By APY" />
          <Card className="p-6">
            {yields.isLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted">
                <Spinner className="h-5 w-5" />
                Loading yields…
              </div>
            ) : yields.isError || topYields.length === 0 ? (
              <p className="text-sm text-muted">Yield data unavailable right now.</p>
            ) : (
              <div className="space-y-3">
                {topYields.map((pool) => (
                  <div
                    key={pool.id}
                    className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold capitalize text-foreground">
                        {pool.project}
                      </span>{" "}
                      <span className="text-sm text-muted">{pool.symbol}</span>
                    </span>
                    <span className="flex items-baseline gap-3 text-sm">
                      <span className="font-semibold text-gold">{pct1(pool.apy)}</span>
                      <span className="text-muted">{formatUsd(pool.tvlUsd)}</span>
                    </span>
                  </div>
                ))}
                <Link
                  href="/network/yields"
                  className="inline-block pt-1 text-sm font-semibold text-gold transition-colors hover:text-gold/80"
                >
                  All yields →
                </Link>
              </div>
            )}
          </Card>
        </section>
      </div>

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
