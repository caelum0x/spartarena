"use client";

import Link from "next/link";
import { formatGwei } from "viem";
import { useMantleNetwork } from "@/hooks/useMantleNetwork";
import { usePrices } from "@/hooks/usePrices";
import { cn } from "@/lib/cn";

/** Precise USD price string ($1,234.56 for >=1, $0.0042 for sub-dollar). */
function formatPrice(usd: number): string {
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: usd >= 1 ? 2 : 4 })}`;
}

/** One headline metric in the live network strip. */
function Metric({ label, value, sub, subPositive }: {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
}) {
  return (
    <div className="px-2">
      <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</p>
      {sub && (
        <p className={cn("mt-0.5 text-xs", subPositive ? "text-success" : "text-crimson-soft")}>
          {sub}
        </p>
      )}
    </div>
  );
}

/** A token-price metric (price headline + 24h change), or "—" when unavailable. */
function TokenMetric({ symbol, price }: {
  symbol: string;
  price?: { usd: number; usd24hChange: number };
}) {
  if (!price) return <Metric label={symbol} value="—" />;
  const change = price.usd24hChange;
  const positive = change >= 0;
  return (
    <Metric
      label={symbol}
      value={formatPrice(price.usd)}
      sub={`${positive ? "+" : ""}${change.toFixed(1)}%`}
      subPositive={positive}
    />
  );
}

/**
 * Live Mantle network summary computed from the real chain RPC (block height +
 * gas price) and the real token-price feed. Renders nothing only when BOTH
 * sources fail; otherwise degrades to "—" for missing metrics. Production data
 * only — no mock values.
 */
export function NetworkStrip() {
  const { data: network, isError: networkError } = useMantleNetwork();
  const { data: prices, isError: pricesError } = usePrices();

  const hasNetwork = !!network;
  const hasPrices = !!prices;

  // Never render an empty/broken strip: bail when neither source produced data.
  // (A source can be "down" either via an error flag or by simply having no
  // data yet — in both cases there is nothing to show for it.)
  const networkDown = networkError || !hasNetwork;
  const pricesDown = pricesError || !hasPrices;
  if (networkDown && pricesDown) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-gold" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Live on Mantle
          </h3>
        </div>
        <Link href="/network" className="text-sm text-gold hover:underline">
          Network →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
        <Metric
          label="Latest block"
          value={network ? network.blockNumber.toString() : "—"}
        />
        <Metric
          label="Gas"
          value={network ? `${formatGwei(network.gasPriceWei)} Gwei` : "—"}
        />
        <TokenMetric symbol="MNT" price={prices?.MNT} />
        <TokenMetric symbol="mETH" price={prices?.mETH} />
      </div>
    </div>
  );
}
