import Link from "next/link";
import type { ByrealTokenView } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatUsd, pct1 } from "@/lib/format";

/** USD price formatter that keeps precision for sub-dollar tokens. */
function formatPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 1) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

/**
 * Compact token row used in the Markets "Top tokens by volume" list. Links to
 * the token detail page and shows symbol, price, signed 24h change and volume.
 */
export function MarketTokenRow({ token }: { token: ByrealTokenView }) {
  const up = token.priceChange24hPct >= 0;

  return (
    <Link href={`/byreal/tokens/${token.mint}`} className="block">
      <Card interactive className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-semibold text-foreground">
                {token.symbol}
              </span>
              {token.topPick && <Badge tone="gold">★ Top pick</Badge>}
            </div>
            <p className="mt-1 truncate text-xs text-muted">{token.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-6 text-right">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Price</p>
              <p className="font-display text-sm font-semibold text-foreground">
                {formatPrice(token.priceUsd)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">24h</p>
              <p
                className={`font-display text-sm font-semibold ${up ? "text-success" : "text-crimson-soft"}`}
              >
                {up ? "+" : ""}
                {pct1(token.priceChange24hPct)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">24h Vol</p>
              <p className="font-display text-sm font-semibold text-foreground">
                {formatUsd(token.volume24hUsd)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
