import Link from "next/link";
import type { ByrealPoolView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { HashViewer } from "@/components/decisions/HashViewer";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A single Byreal pool, showing pair, TVL, APR and 24h volume. When the backend
 * flags it as the top pick it is highlighted, and any ByrealPoolAnalyst
 * decision-proof hash is surfaced (with a "recorded on Mantle" badge).
 */
export function PoolCard({ pool }: { pool: ByrealPoolView }) {
  const riskTone =
    pool.riskScore === undefined
      ? "muted"
      : pool.riskScore >= 60
        ? "crimson"
        : pool.riskScore >= 30
          ? "gold"
          : "success";

  return (
    <Card
      glow={pool.topPick}
      className={cn(pool.topPick && "border-gold/40")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/byreal/pools/${pool.poolAddress}`}
            className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
          >
            {pool.pairLabel}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {pool.poolAddress.slice(0, 10)}…{pool.poolAddress.slice(-6)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {pool.topPick && <Badge tone="gold">★ Top pick</Badge>}
          {pool.riskScore !== undefined && (
            <Badge tone={riskTone}>Risk {Math.round(pool.riskScore)}</Badge>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="TVL" value={formatUsd(pool.tvlUsd)} />
        <Stat label="Est. APR" value={pct1(pool.estimatedAprPct)} />
        <Stat label="24h Volume" value={formatUsd(pool.volume24hUsd)} />
      </div>

      {(pool.feeBps !== undefined || pool.utilizationPct !== undefined) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pool.feeBps !== undefined && (
            <Badge tone="info">{pool.feeBps}bps fee</Badge>
          )}
          {pool.utilizationPct !== undefined && (
            <Badge tone="muted">{Math.round(pool.utilizationPct)}% utilization</Badge>
          )}
          {pool.confidence !== undefined && (
            <Badge tone="muted">{Math.round(pool.confidence)}% confidence</Badge>
          )}
        </div>
      )}

      {pool.humanSummary && (
        <p className="mt-4 text-sm leading-relaxed text-foreground/80">
          {pool.humanSummary}
        </p>
      )}

      {pool.proof && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              ByrealPoolAnalyst Proof
            </p>
            {pool.proof.recordedOnMantle && (
              <Badge tone="gold">Recorded on Mantle</Badge>
            )}
          </div>
          <HashViewer label="Decision proof" hash={pool.proof.toolProofHash} />
        </div>
      )}
    </Card>
  );
}
