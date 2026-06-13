"use client";

import { useMemo, useState } from "react";
import { Container, PageHeader } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { TokenCard } from "@/components/byreal/TokenCard";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { cn } from "@/lib/cn";
import type { ByrealTokenView } from "@/types";

const SORTS = {
  volume: { label: "Volume", fn: (a: ByrealTokenView, b: ByrealTokenView) => b.volume24hUsd - a.volume24hUsd },
  liquidity: { label: "Liquidity", fn: (a: ByrealTokenView, b: ByrealTokenView) => b.liquidityScore - a.liquidityScore },
  risk: { label: "Lowest risk", fn: (a: ByrealTokenView, b: ByrealTokenView) => a.riskScore - b.riskScore },
  movers: { label: "Top movers", fn: (a: ByrealTokenView, b: ByrealTokenView) => Math.abs(b.priceChange24hPct) - Math.abs(a.priceChange24hPct) },
} as const;

type SortKey = keyof typeof SORTS;

export default function ByrealTokensPage() {
  const { data, isLoading, isError, error } = useByrealTokens();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("volume");

  const tokens = useMemo(() => {
    const all = data?.data ?? [];
    const q = query.trim().toLowerCase();
    const filtered =
      q.length === 0
        ? all
        : all.filter(
            (t) =>
              t.symbol.toLowerCase().includes(q) ||
              t.name.toLowerCase().includes(q) ||
              t.mint.toLowerCase().includes(q),
          );
    return [...filtered].sort(SORTS[sort].fn);
  }, [data, query, sort]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Byreal Tokens"
        description="Trending Byreal (Solana) tokens ranked by the ByrealPoolAnalyst Spartan — live price, 24h move and volume, with blended liquidity and risk scoring. The top pick carries a verifiable decision-proof hash. Reads are wired for real."
      />

      <ByrealTabs />

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol, name or mint…"
            aria-label="Search tokens"
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
          Could not load Byreal tokens.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 p-10 text-center text-muted">
          No Byreal tokens match this view.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <TokenCard key={token.mint} token={token} />
          ))}
        </div>
      )}
    </Container>
  );
}
