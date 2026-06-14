"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { useMantleDexs, type MantleDex } from "@/hooks/useMantleDexs";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Format a percentage with a sign and one decimal ("+4.2%", "-1.8%"). */
function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function MantleDexsPage() {
  const { data, isLoading, isError, error } = useMantleDexs();

  const dexs = useMemo<readonly MantleDex[]>(() => data?.dexs ?? [], [data]);

  // Share-of-total uses the largest listed 24h volume as the bar baseline so the
  // top DEX fills the bar and the rest scale relative to it.
  const maxVol24h = useMemo(
    () => dexs.reduce((max, d) => Math.max(max, d.vol24h ?? 0), 0),
    [dexs],
  );

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="DEX Volumes"
        description="Trading volume of decentralized exchanges on Mantle, aggregated from DefiLlama and ranked by 24h volume. Figures reflect on-chain swap activity and move with the market."
        actions={
          <Link
            href="/network"
            className="text-sm font-medium text-gold transition-colors hover:text-gold/80"
          >
            ← Network
          </Link>
        }
      />

      <NetworkTabs />

      {!isLoading && !isError && data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat
            label="24h Volume"
            value={data.total24h !== null ? formatUsd(data.total24h) : "—"}
            hint="Across all Mantle DEXs"
          />
          <Stat
            label="7d Volume"
            value={data.total7d !== null ? formatUsd(data.total7d) : "—"}
          />
          <Stat label="DEXs" value={dexs.length.toString()} hint="Ranked by 24h volume" />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <Card className="border-crimson/30 bg-crimson/5 p-10 text-center">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle DEX volumes.
          </p>
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </Card>
      ) : dexs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No DEX volume reported for Mantle right now.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dexs.map((dex, index) => {
            const rank = index + 1;
            const isTop = rank === 1;
            const vol24h = dex.vol24h ?? 0;
            const sharePct = maxVol24h > 0 ? (vol24h / maxVol24h) * 100 : 0;
            const change = dex.change7dOver7d;
            return (
              <Card key={dex.name} glow={isTop} className={cn(isTop && "border-gold/40")}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-bold",
                        isTop
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-border bg-surface/60 text-muted",
                      )}
                    >
                      {rank}
                    </div>
                    <div className="min-w-0">
                      <span className="font-display text-lg font-semibold text-foreground">
                        {dex.name}
                      </span>
                      {change !== null && (
                        <div className="mt-2">
                          <Badge tone={change >= 0 ? "success" : "crimson"}>
                            {formatChange(change)} 7d/7d
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs uppercase tracking-wider text-muted">24h Volume</p>
                    <p className="font-display text-3xl font-bold text-gold">
                      {dex.vol24h !== null ? formatUsd(dex.vol24h) : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-surface/60">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isTop ? "bg-gold" : "bg-gold/50",
                      )}
                      style={{ width: `${sharePct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Stat
                    label="24h Volume"
                    value={dex.vol24h !== null ? formatUsd(dex.vol24h) : "—"}
                  />
                  <Stat
                    label="7d Volume"
                    value={dex.vol7d !== null ? formatUsd(dex.vol7d) : "—"}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        Source:{" "}
        <Link
          href="https://defillama.com/dexs/chains/Mantle"
          target="_blank"
          rel="noreferrer"
          className="text-gold hover:text-gold/80"
        >
          DefiLlama
        </Link>
      </p>
    </Container>
  );
}
