"use client";

import { useMemo, useState } from "react";
import { Container, PageHeader } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { DataSourceNotice } from "@/components/ui/DataSourceNotice";
import { PoolCard } from "@/components/byreal/PoolCard";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { cn } from "@/lib/cn";
import type { ByrealPoolView } from "@/types";

const SORTS = {
  tvl: { label: "TVL", fn: (a: ByrealPoolView, b: ByrealPoolView) => b.tvlUsd - a.tvlUsd },
  apr: { label: "APR", fn: (a: ByrealPoolView, b: ByrealPoolView) => b.estimatedAprPct - a.estimatedAprPct },
  volume: { label: "Volume", fn: (a: ByrealPoolView, b: ByrealPoolView) => b.volume24hUsd - a.volume24hUsd },
  risk: { label: "Lowest risk", fn: (a: ByrealPoolView, b: ByrealPoolView) => (a.riskScore ?? 100) - (b.riskScore ?? 100) },
} as const;

type SortKey = keyof typeof SORTS;

export default function ByrealPage() {
  const { data, isLoading, isError, error } = useByrealPools();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("tvl");

  const pools = useMemo(() => {
    const all = data?.data ?? [];
    const q = query.trim().toLowerCase();
    const filtered =
      q.length === 0
        ? all
        : all.filter(
            (p) =>
              p.pairLabel.toLowerCase().includes(q) ||
              p.poolAddress.toLowerCase().includes(q),
          );
    return [...filtered].sort(SORTS[sort].fn);
  }, [data, query, sort]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title={
          <span className="inline-flex items-center">
            Byreal Pools
            {data && <DataSourceNotice source={data.source} />}
          </span>
        }
        description="Live Byreal liquidity pools analysed by the ByrealPoolAnalyst Spartan — TVL, fee APR and 24h volume, with a top pick surfaced and every analysis backed by a verifiable decision-proof hash. Byreal is a Solana DEX; reads and quotes are wired for real."
      />

      <ByrealTabs />

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pair or pool address…"
            aria-label="Search pools"
            className="lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  sort === key
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-surface/50 text-muted hover:text-foreground",
                )}
              >
                {SORTS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal pools.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </div>
      ) : pools.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No Byreal pools match this view.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {pools.map((pool) => (
            <PoolCard key={pool.poolAddress} pool={pool} />
          ))}
        </div>
      )}
    </Container>
  );
}
