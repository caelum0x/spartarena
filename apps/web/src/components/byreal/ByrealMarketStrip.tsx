"use client";

import Link from "next/link";
import { useByrealPools } from "@/hooks/useByrealPools";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { formatUsd } from "@/lib/format";

/** One headline metric in the live market strip. */
function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gold">{sub}</p>}
    </div>
  );
}

/**
 * Live Byreal (Solana) market summary computed from the real pools + tokens
 * boards. Renders nothing until at least one source resolves, and degrades to a
 * compact CTA on error — never blocks the page. Production data only.
 */
export function ByrealMarketStrip() {
  const { data: poolData, isError: poolsError } = useByrealPools();
  const { data: tokenData, isError: tokensError } = useByrealTokens();

  const pools = poolData?.data ?? [];
  const tokens = tokenData?.data ?? [];

  const totalTvl = pools.reduce((sum, p) => sum + p.tvlUsd, 0);
  const totalVol = pools.reduce((sum, p) => sum + p.volume24hUsd, 0);
  const topPool = pools.find((p) => p.topPick) ?? pools[0];
  const topToken = tokens.find((t) => t.topPick) ?? tokens[0];

  const hasData = pools.length > 0 || tokens.length > 0;
  if ((poolsError && tokensError) || !hasData) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-gold" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Live Byreal markets
          </h3>
        </div>
        <Link href="/byreal" className="text-sm text-gold hover:underline">
          Explore →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
        <Metric label="Pool TVL" value={pools.length ? formatUsd(totalTvl) : "—"} />
        <Metric label="24h Volume" value={pools.length ? formatUsd(totalVol) : "—"} />
        <Metric
          label="Top pool"
          value={topPool?.pairLabel ?? "—"}
          sub={topPool ? `${topPool.estimatedAprPct.toFixed(1)}% APR` : undefined}
        />
        <Metric
          label="Top token"
          value={topToken?.symbol ?? "—"}
          sub={topToken ? formatUsd(topToken.volume24hUsd) : undefined}
        />
      </div>
    </div>
  );
}
