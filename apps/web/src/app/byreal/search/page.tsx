"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ByrealPoolView, ByrealTokenView } from "@/types";

/** Cap per result section so the page stays scannable. */
const SECTION_LIMIT = 12;

/** Tone for a 0-100 risk score badge — higher means riskier. */
function riskTone(risk: number | undefined): "success" | "gold" | "crimson" | "muted" {
  if (risk === undefined) return "muted";
  if (risk >= 60) return "crimson";
  if (risk >= 30) return "gold";
  return "success";
}

/** Render a USD price that may be null as a friendly em-dash. */
function priceLabel(priceUsd: number | null): string {
  return priceUsd === null ? "—" : formatUsd(priceUsd);
}

interface PoolRowProps {
  readonly pool: ByrealPoolView;
}

function PoolRow({ pool }: PoolRowProps) {
  return (
    <Link
      href={`/byreal/pools/${pool.poolAddress}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/40 px-4 py-3 transition-colors hover:border-gold/40 hover:bg-surface/70"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{pool.pairLabel}</p>
        <p className="truncate font-mono text-xs text-muted">{pool.poolAddress}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-sm text-muted sm:inline">{formatUsd(pool.tvlUsd)} TVL</span>
        <Badge tone="gold">{pct1(pool.estimatedAprPct)} APR</Badge>
        {pool.riskScore !== undefined && (
          <Badge tone={riskTone(pool.riskScore)}>Risk {Math.round(pool.riskScore)}</Badge>
        )}
      </div>
    </Link>
  );
}

interface TokenRowProps {
  readonly token: ByrealTokenView;
}

function TokenRow({ token }: TokenRowProps) {
  const up = token.priceChange24hPct >= 0;
  return (
    <Link
      href={`/byreal/tokens/${token.mint}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/40 px-4 py-3 transition-colors hover:border-gold/40 hover:bg-surface/70"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {token.symbol} <span className="text-muted">· {token.name}</span>
        </p>
        <p className="truncate font-mono text-xs text-muted">{token.mint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right">
        <span className="text-sm font-medium text-foreground">{priceLabel(token.priceUsd)}</span>
        <span className={cn("text-sm font-medium", up ? "text-success" : "text-crimson-soft")}>
          {up ? "+" : ""}
          {pct1(token.priceChange24hPct)}
        </span>
      </div>
    </Link>
  );
}

interface ResultSectionProps<T> {
  readonly title: string;
  readonly total: number;
  readonly items: readonly T[];
  readonly renderRow: (item: T) => React.ReactNode;
  readonly emptyHint: string;
}

function ResultSection<T>({ title, total, items, renderRow, emptyHint }: ResultSectionProps<T>) {
  const shown = items.slice(0, SECTION_LIMIT);
  const extra = items.length - shown.length;
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted">{total} result{total === 1 ? "" : "s"}</span>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface/40 px-4 py-6 text-center text-sm text-muted">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((item) => renderRow(item))}
          {extra > 0 && (
            <p className="px-1 pt-1 text-xs text-muted">+{extra} more — refine your search to narrow this list.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function ByrealSearchPage() {
  const pools = useByrealPools();
  const tokens = useByrealTokens();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const allPools = pools.data?.data ?? [];
  const allTokens = tokens.data?.data ?? [];

  const matchedPools = useMemo<readonly ByrealPoolView[]>(() => {
    if (!hasQuery) {
      return [...allPools].sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 6);
    }
    return allPools.filter(
      (p) =>
        p.pairLabel.toLowerCase().includes(q) || p.poolAddress.toLowerCase().includes(q),
    );
  }, [allPools, q, hasQuery]);

  const matchedTokens = useMemo<readonly ByrealTokenView[]>(() => {
    if (!hasQuery) {
      return [...allTokens].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, 6);
    }
    return allTokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.mint.toLowerCase().includes(q),
    );
  }, [allTokens, q, hasQuery]);

  const isLoading = pools.isLoading || tokens.isLoading;
  const bothErrored = pools.isError && tokens.isError;
  const bothEmpty = hasQuery && matchedPools.length === 0 && matchedTokens.length === 0;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Search"
        description="Find any Byreal pool or token by name, symbol, pair or address — across the live Byreal (Solana) liquidity set. Results link straight to their detail page."
      />

      <ByrealTabs />

      <div className="mb-8">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pools and tokens — pair, symbol, name or address…"
          aria-label="Search Byreal pools and tokens"
          autoFocus
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : bothErrored ? (
        <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
          Could not load Byreal pools or tokens.
          <span className="mt-1 block text-sm text-muted">
            {(pools.error instanceof Error && pools.error.message) ||
              (tokens.error instanceof Error && tokens.error.message) ||
              "Please try again shortly."}
          </span>
        </Card>
      ) : bothEmpty ? (
        <Card className="text-center text-muted">
          No Byreal pools or tokens match &ldquo;{query.trim()}&rdquo;.
          <span className="mt-1 block text-sm">Try a token symbol, a pair like &ldquo;SOL&rdquo;, or an address.</span>
        </Card>
      ) : (
        <div className="flex flex-col gap-10">
          {!hasQuery && (
            <p className="text-sm text-muted">
              Start typing to search. Showing a few popular picks by TVL and volume in the meantime.
            </p>
          )}
          <ResultSection
            title={hasQuery ? "Pools" : "Popular pools"}
            total={matchedPools.length}
            items={matchedPools}
            renderRow={(pool) => <PoolRow key={pool.poolAddress} pool={pool} />}
            emptyHint={
              pools.isError
                ? "Byreal pools are unavailable right now."
                : `No Byreal pools match “${query.trim()}”.`
            }
          />
          <ResultSection
            title={hasQuery ? "Tokens" : "Popular tokens"}
            total={matchedTokens.length}
            items={matchedTokens}
            renderRow={(token) => <TokenRow key={token.mint} token={token} />}
            emptyHint={
              tokens.isError
                ? "Byreal tokens are unavailable right now."
                : `No Byreal tokens match “${query.trim()}”.`
            }
          />
        </div>
      )}
    </Container>
  );
}
