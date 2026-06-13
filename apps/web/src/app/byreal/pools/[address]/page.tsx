"use client";

import { use } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stat } from "@/components/ui/Stat";
import { HashViewer } from "@/components/decisions/HashViewer";
import { Sparkline } from "@/components/ui/Sparkline";
import { useByrealPool } from "@/hooks/useByrealPools";
import { useByrealPoolKline } from "@/hooks/useByrealPoolKline";
import { formatUsd, pct1 } from "@/lib/format";

export default function ByrealPoolDetailPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const { data: pool, isLoading, isError, error } = useByrealPool(address);
  const { data: kline } = useByrealPoolKline(address);

  if (isLoading) {
    return (
      <Container className="py-20">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </Container>
    );
  }

  if (isError || !pool) {
    return (
      <Container className="py-12">
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load this Byreal pool.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
          <div className="mt-5">
            <Link href="/byreal">
              <Button variant="secondary">Back to Pools</Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const prices = kline?.prices ?? [];
  const hasHistory = prices.length >= 2;
  const first = prices[0] ?? 0;
  const last = prices[prices.length - 1] ?? 0;
  const changePct = hasHistory ? ((last - first) / (first || 1)) * 100 : 0;
  const changeUp = changePct >= 0;

  const riskTone =
    pool.riskScore === undefined
      ? "muted"
      : pool.riskScore >= 60
        ? "crimson"
        : pool.riskScore >= 30
          ? "gold"
          : "success";

  return (
    <Container className="py-12">
      <div className="mb-6">
        <Link href="/byreal" className="text-sm text-muted hover:text-foreground">
          ← All Pools
        </Link>
      </div>

      <PageHeader
        eyebrow="Byreal Pool"
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {pool.pairLabel}
            {pool.riskScore !== undefined && (
              <Badge tone={riskTone}>Risk {Math.round(pool.riskScore)}</Badge>
            )}
          </span>
        }
        description={pool.humanSummary}
        actions={
          <Link href="/byreal/swap">
            <Button>Swap this pair</Button>
          </Link>
        }
      />

      <p className="-mt-4 mb-6 break-all font-mono text-xs text-muted">{pool.poolAddress}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
        <Stat label="Est. APR" value={pct1(pool.estimatedAprPct)} />
        <Stat label="24h Volume" value={formatUsd(pool.volume24hUsd)} />
        <Stat
          label="Utilization"
          value={pool.utilizationPct !== undefined ? `${Math.round(pool.utilizationPct)}%` : "—"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pool.feeBps !== undefined && <Badge tone="info">{pool.feeBps}bps fee</Badge>}
        {pool.confidence !== undefined && (
          <Badge tone="muted">{Math.round(pool.confidence)}% confidence</Badge>
        )}
      </div>

      {hasHistory && kline && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Price history</h2>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted">Price ({kline.window})</span>
              <Badge tone={changeUp ? "success" : "crimson"}>
                {changeUp ? "▲" : "▼"} {pct1(Math.abs(changePct))}
              </Badge>
            </div>
            <Sparkline
              data={prices}
              className={changeUp ? "w-full text-success" : "w-full text-crimson-soft"}
              height={64}
            />
          </Card>
        </section>
      )}

      {pool.signals && pool.signals.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Analyst signals</h2>
          <Card>
            <ul className="space-y-2.5">
              {pool.signals.map((signal, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {signal}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {pool.proof && (
        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              ByrealPoolAnalyst Proof
            </h2>
            {pool.proof.recordedOnMantle && <Badge tone="gold">Recorded on Mantle</Badge>}
          </div>
          <Card>
            <HashViewer label="Decision proof" hash={pool.proof.toolProofHash} />
          </Card>
        </section>
      )}
    </Container>
  );
}
