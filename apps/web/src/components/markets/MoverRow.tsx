import Link from "next/link";
import type { ByrealTokenView } from "@/types";
import { pct1 } from "@/lib/format";

/**
 * A single "biggest mover" line: a token symbol linking to its detail page with
 * its signed 24h price change, coloured green when up and crimson when down.
 */
export function MoverRow({ token }: { token: ByrealTokenView }) {
  const up = token.priceChange24hPct >= 0;

  return (
    <Link
      href={`/byreal/tokens/${token.mint}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-2.5 transition-colors hover:border-gold/40"
    >
      <div className="min-w-0">
        <span className="font-display text-sm font-semibold text-foreground">{token.symbol}</span>
        <span className="ml-2 truncate text-xs text-muted">{token.name}</span>
      </div>
      <span
        className={`shrink-0 font-display text-sm font-semibold ${up ? "text-success" : "text-crimson-soft"}`}
      >
        {up ? "+" : ""}
        {pct1(token.priceChange24hPct)}
      </span>
    </Link>
  );
}
