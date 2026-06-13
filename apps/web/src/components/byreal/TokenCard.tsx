import Link from "next/link";
import type { ByrealTokenView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { HashViewer } from "@/components/decisions/HashViewer";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Compact USD price formatter that keeps precision for sub-dollar tokens. */
function formatPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 1) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

/**
 * A single discovered Byreal token: price, 24h move, liquidity/risk scoring and
 * the analyst's rationale. The set's top pick is highlighted and carries the
 * verifiable discovery proof.
 */
export function TokenCard({ token }: { token: ByrealTokenView }) {
  const up = token.priceChange24hPct >= 0;
  const riskTone =
    token.riskScore >= 60 ? "crimson" : token.riskScore >= 35 ? "gold" : "success";

  return (
    <Card glow={token.topPick} className={cn(token.topPick && "border-gold/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/byreal/tokens/${token.mint}`}
            className="font-display text-lg font-semibold text-foreground transition-colors hover:text-gold"
          >
            {token.symbol}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">{token.name}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {token.topPick && <Badge tone="gold">★ Top pick</Badge>}
          <Badge tone={riskTone}>Risk {Math.round(token.riskScore)}</Badge>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Price" value={formatPrice(token.priceUsd)} />
        <Stat
          label="24h"
          value={
            <span className={up ? "text-success" : "text-crimson-soft"}>
              {up ? "+" : ""}
              {pct1(token.priceChange24hPct)}
            </span>
          }
        />
        <Stat label="24h Volume" value={formatUsd(token.volume24hUsd)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="info">{Math.round(token.liquidityScore)} liquidity</Badge>
        {token.marketCapUsd !== null && (
          <Badge tone="muted">{formatUsd(token.marketCapUsd)} mcap</Badge>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/80">{token.reason}</p>

      <Link
        href={`/byreal/swap?tokenIn=${encodeURIComponent(token.mint)}`}
        className="mt-3 inline-block text-sm font-medium text-gold hover:underline"
      >
        Swap {token.symbol} →
      </Link>

      {token.proof && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Discovery Proof
            </p>
            {token.proof.recordedOnMantle && <Badge tone="gold">Recorded on Mantle</Badge>}
          </div>
          <HashViewer label="Decision proof" hash={token.proof.toolProofHash} />
        </div>
      )}
    </Card>
  );
}
