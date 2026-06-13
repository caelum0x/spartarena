"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { PoolCard } from "@/components/byreal/PoolCard";
import { TokenCard } from "@/components/byreal/TokenCard";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { useWatchlist } from "@/hooks/useWatchlist";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealPoolView, ByrealTokenView } from "@/types";

const MAX_RESULTS = 8;

/** A small "Remove" control rendered alongside a watched card. */
function RemoveBar({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full border border-border bg-surface/50 px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-crimson/50 hover:text-crimson-soft"
      >
        Remove
      </button>
    </div>
  );
}

/** A compact search-result row with an Add/Added toggle. */
function AddRow({
  primary,
  secondary,
  meta,
  added,
  onToggle,
}: {
  primary: string;
  secondary: string;
  meta?: string;
  added: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{primary}</p>
        <p className="truncate font-mono text-xs text-muted">{secondary}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta && <span className="hidden text-xs text-muted sm:inline">{meta}</span>}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "rounded-full border px-3.5 py-1 text-xs font-medium transition-all",
            added
              ? "border-gold bg-gold/15 text-gold"
              : "border-border bg-surface/50 text-muted hover:text-foreground",
          )}
        >
          {added ? "Added" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function ByrealWatchlistPage() {
  const wl = useWatchlist();
  const poolsQuery = useByrealPools();
  const tokensQuery = useByrealTokens();
  const [query, setQuery] = useState("");

  const allPools = useMemo<readonly ByrealPoolView[]>(
    () => poolsQuery.data?.data ?? [],
    [poolsQuery.data],
  );
  const allTokens = useMemo<readonly ByrealTokenView[]>(
    () => tokensQuery.data?.data ?? [],
    [tokensQuery.data],
  );

  // Watched items, resolved against live data; ids no longer live are skipped.
  const watchedPools = useMemo(
    () => allPools.filter((p) => wl.pools.includes(p.poolAddress)),
    [allPools, wl.pools],
  );
  const watchedTokens = useMemo(
    () => allTokens.filter((t) => wl.tokens.includes(t.mint)),
    [allTokens, wl.tokens],
  );

  // Search results for the Add panel (only meaningful with a query).
  const { poolResults, tokenResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return { poolResults: [], tokenResults: [] };
    const poolHits = allPools
      .filter(
        (p) =>
          p.pairLabel.toLowerCase().includes(q) ||
          p.poolAddress.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
    const tokenHits = allTokens
      .filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.mint.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
    return { poolResults: poolHits, tokenResults: tokenHits };
  }, [query, allPools, allTokens]);

  const isLoading = poolsQuery.isLoading || tokensQuery.isLoading;
  const nothingWatched = wl.pools.length === 0 && wl.tokens.length === 0;
  const hasResults = poolResults.length > 0 || tokenResults.length > 0;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Watchlist"
        description="Your saved Byreal pools and tokens with live data, stored locally in your browser."
      />

      <ByrealTabs />

      {!wl.ready ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Add to watchlist */}
          <Card className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Add to watchlist
              </h2>
              {isLoading && <Spinner className="h-4 w-4" />}
            </div>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search live pools and tokens by name, symbol, address…"
              aria-label="Search Byreal pools and tokens"
            />
            {query.trim().length > 0 && (
              <div className="mt-4 space-y-4">
                {poolResults.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Pools
                    </p>
                    <div className="space-y-2">
                      {poolResults.map((p) => (
                        <AddRow
                          key={p.poolAddress}
                          primary={p.pairLabel}
                          secondary={`${p.poolAddress.slice(0, 10)}…${p.poolAddress.slice(-6)}`}
                          meta={`${formatUsd(p.tvlUsd)} TVL · ${pct1(p.estimatedAprPct)} APR`}
                          added={wl.isWatchedPool(p.poolAddress)}
                          onToggle={() => wl.togglePool(p.poolAddress)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {tokenResults.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Tokens
                    </p>
                    <div className="space-y-2">
                      {tokenResults.map((t) => (
                        <AddRow
                          key={t.mint}
                          primary={`${t.symbol} · ${t.name}`}
                          secondary={`${t.mint.slice(0, 10)}…${t.mint.slice(-6)}`}
                          meta={`${formatUsd(t.volume24hUsd)} 24h vol`}
                          added={wl.isWatchedToken(t.mint)}
                          onToggle={() => wl.toggleToken(t.mint)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {!hasResults && !isLoading && (
                  <p className="text-sm text-muted">No live pools or tokens match “{query.trim()}”.</p>
                )}
              </div>
            )}
          </Card>

          {nothingWatched ? (
            <Card className="text-center">
              <p className="font-display text-lg font-semibold text-foreground">
                Your watchlist is empty
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Search above to pin Byreal pools and tokens, or browse the boards and add
                the ones you want to track. Everything is saved locally in your browser.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/byreal"
                  className="rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-sm font-medium text-gold transition-colors hover:bg-gold/20"
                >
                  Browse pools →
                </Link>
                <Link
                  href="/byreal/tokens"
                  className="rounded-full border border-border bg-surface/50 px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Browse tokens →
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-10">
              {/* Watched pools */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Watched pools
                  </h2>
                  <Badge tone="muted">{wl.pools.length}</Badge>
                </div>
                {wl.pools.length === 0 ? (
                  <p className="text-sm text-muted">No pools watched yet.</p>
                ) : watchedPools.length === 0 && isLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : watchedPools.length === 0 ? (
                  <p className="text-sm text-muted">
                    Your watched pools are not in the current live set right now.
                  </p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {watchedPools.map((pool) => (
                      <div key={pool.poolAddress}>
                        <RemoveBar
                          label="Watched pool"
                          onRemove={() => wl.removePool(pool.poolAddress)}
                        />
                        <PoolCard pool={pool} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Watched tokens */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Watched tokens
                  </h2>
                  <Badge tone="muted">{wl.tokens.length}</Badge>
                </div>
                {wl.tokens.length === 0 ? (
                  <p className="text-sm text-muted">No tokens watched yet.</p>
                ) : watchedTokens.length === 0 && isLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : watchedTokens.length === 0 ? (
                  <p className="text-sm text-muted">
                    Your watched tokens are not in the current live set right now.
                  </p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {watchedTokens.map((token) => (
                      <div key={token.mint}>
                        <RemoveBar
                          label="Watched token"
                          onRemove={() => wl.removeToken(token.mint)}
                        />
                        <TokenCard token={token} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
