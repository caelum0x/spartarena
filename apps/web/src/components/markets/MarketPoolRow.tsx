import Link from "next/link";
import type { ByrealPoolView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, pct1 } from "@/lib/format";

/** Maps a 0-100 pool risk score to a Badge tone, tolerating an undefined score. */
function riskTone(score: number | undefined): "crimson" | "gold" | "success" | "muted" {
  if (score === undefined) return "muted";
  if (score >= 60) return "crimson";
  if (score >= 30) return "gold";
  return "success";
}

/**
 * Compact pool row used in the Markets "Top pools by APR" list. Links to the
 * pool detail page and surfaces pair, TVL, APR and a risk badge.
 */
export function MarketPoolRow({ pool }: { pool: ByrealPoolView }) {
  return (
    <Link href={`/byreal/pools/${pool.poolAddress}`} className="block">
      <Card interactive className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-semibold text-foreground">
                {pool.pairLabel}
              </span>
              {pool.topPick && <Badge tone="gold">★ Top pick</Badge>}
              <Badge tone={riskTone(pool.riskScore)}>
                {pool.riskScore !== undefined ? `Risk ${Math.round(pool.riskScore)}` : "Risk —"}
              </Badge>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted">{pool.poolAddress}</p>
          </div>
          <div className="flex shrink-0 items-center gap-6 text-right">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">TVL</p>
              <p className="font-display text-sm font-semibold text-foreground">
                {formatUsd(pool.tvlUsd)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Est. APR</p>
              <p className="font-display text-sm font-semibold text-gold">
                {pct1(pool.estimatedAprPct)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
