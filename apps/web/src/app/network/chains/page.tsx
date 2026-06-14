"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useChainComparison, type TopChain } from "@/hooks/useChainComparison";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface ChainRowProps {
  readonly rank: number;
  readonly chain: TopChain;
  readonly max: number;
}

/** A single ranked chain row: rank, name, TVL and a bar scaled to the #1 chain. */
function ChainRow({ rank, chain, max }: ChainRowProps) {
  const barWidth = max > 0 ? Math.max(2, (chain.tvl / max) * 100) : 0;
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-3",
        chain.isMantle && "border border-gold/40 bg-gold/5",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-muted">
            #{rank}
          </span>
          <span
            className={cn(
              "font-display text-base font-semibold",
              chain.isMantle ? "text-gold" : "text-foreground",
            )}
          >
            {chain.name}
          </span>
          {chain.isMantle && (
            <Badge tone="gold" className="ml-1">
              Mantle
            </Badge>
          )}
        </div>
        <span className="font-display text-base font-semibold text-foreground">
          {formatUsd(chain.tvl)}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full",
            chain.isMantle ? "bg-gold" : "bg-crimson/60",
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function NetworkChainsPage() {
  const chainsQuery = useChainComparison();
  const data = chainsQuery.data;

  const topChains = data?.topChains ?? [];
  const max = topChains.length > 0 ? topChains[0]!.tvl : 0;

  // Split the appended below-top-15 Mantle entry (if any) from the contiguous
  // top list so it can be rendered after a separator.
  const TOP_N = 15;
  const inlineChains =
    data && data.mantleRank !== null && data.mantleRank > TOP_N
      ? topChains.slice(0, TOP_N)
      : topChains;
  const trailingMantle =
    data && data.mantleRank !== null && data.mantleRank > TOP_N
      ? topChains.find((c) => c.isMantle && c.name === "Mantle") ?? null
      : null;

  const rankLabel =
    data && data.mantleRank !== null
      ? `#${data.mantleRank} of ${data.totalChains}`
      : "—";

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Chain Comparison"
        description="Where Mantle stands among all chains by total value locked, sourced from DefiLlama."
      />

      <NetworkTabs />

      {chainsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : chainsQuery.isError || !data ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load chain comparison data
          </p>
          <p className="mt-2 text-sm text-muted">
            The DefiLlama feed is temporarily unavailable. Please try again shortly.
          </p>
          <button
            type="button"
            onClick={() => void chainsQuery.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : topChains.length === 0 ? (
        <Card className="p-6">
          <p className="font-display text-lg font-semibold text-foreground">
            No chain data available
          </p>
          <p className="mt-2 text-sm text-muted">
            DefiLlama is not reporting any chain TVL right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Mantle TVL"
              value={data.mantleTvl !== null ? formatUsd(data.mantleTvl) : "—"}
              hint="Total value locked on Mantle"
            />
            <Stat
              label="Mantle rank"
              value={rankLabel}
              hint="By TVL across all chains"
            />
            <Stat
              label="Context"
              value={
                data.mantleRank !== null ? (
                  <span className="flex items-center gap-2">
                    <span>Top {Math.round((data.mantleRank / data.totalChains) * 100)}%</span>
                    <Badge tone="gold">{data.totalChains} chains</Badge>
                  </span>
                ) : (
                  "Not ranked"
                )
              }
              hint="Mantle's standing among tracked chains"
            />
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                Top chains by TVL
              </h2>
              <span className="text-xs text-muted">Bars scaled to #1</span>
            </div>
            <div className="space-y-1">
              {inlineChains.map((chain, i) => (
                <ChainRow key={`${chain.name}-${i}`} rank={i + 1} chain={chain} max={max} />
              ))}

              {trailingMantle && (
                <>
                  <div className="py-2 text-center text-sm text-muted">…</div>
                  <ChainRow
                    rank={data.mantleRank!}
                    chain={trailingMantle}
                    max={max}
                  />
                </>
              )}
            </div>
          </Card>

          <p className="text-xs text-muted">
            Source:{" "}
            <Link
              href="https://defillama.com/chains"
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
