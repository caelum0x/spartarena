"use client";

import Link from "next/link";
import { formatGwei } from "viem";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useMantleNetwork } from "@/hooks/useMantleNetwork";
import { usePrices, type PriceMap } from "@/hooks/usePrices";
import { formatUsd } from "@/lib/format";
import { env } from "@/config/env";
import { cn } from "@/lib/cn";

/** Section heading shared across the Network dashboard. */
function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** A small pulsing dot used as a "live" indicator. */
function LiveDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
    </span>
  );
}

/** Best-effort host extraction for display (falls back to the raw URL). */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Signed 24h change, formatted to one decimal with on-brand colour. */
function ChangeBadge({ change }: { change: number }) {
  const positive = change >= 0;
  const sign = positive ? "+" : "";
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        positive ? "text-success" : "text-crimson-soft",
      )}
    >
      {sign}
      {change.toFixed(1)}%
    </span>
  );
}

/** Precise USD price (full precision for sub-dollar / stablecoins, commas for large). */
function formatPrice(usd: number): string {
  const max = usd >= 1000 ? 2 : usd >= 1 ? 4 : 6;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: max })}`;
}

/** Order we prefer to show tokens in (others fall in after, alphabetically). */
const SYMBOL_ORDER = ["MNT", "mETH", "USDY", "USDT", "USDC"] as const;

function orderedSymbols(prices: PriceMap): string[] {
  const keys = Object.keys(prices);
  const known = SYMBOL_ORDER.filter((s) => keys.includes(s));
  const extra = keys.filter((k) => !SYMBOL_ORDER.includes(k as never)).sort();
  return [...known, ...extra];
}

export default function NetworkPage() {
  const network = useMantleNetwork();
  const prices = usePrices();

  const status = network.data;
  const priceMap = prices.data;
  const symbols = priceMap ? orderedSymbols(priceMap) : [];

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Network"
        description="Live status of the real Mantle chain — latest block height and gas price read straight from the public RPC — alongside real-time market prices for the tokens SpartArena settles in. Everything here is on-chain and on-market data, refreshed on a gentle interval. No mock data."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/network/blocks" className="text-sm font-medium text-gold hover:underline">
              Blocks →
            </Link>
            <Link href="/network/gas" className="text-sm font-medium text-gold hover:underline">
              Gas Tracker →
            </Link>
            <Badge tone="success">
              <LiveDot />
              <span className="ml-1">Live</span>
            </Badge>
          </div>
        }
      />

      <div className="space-y-12">
        <section>
          <SectionHeading title="Chain status" hint="Refreshes every 12s" />

          {network.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-8 w-8" />
            </div>
          ) : network.isError || !status ? (
            <Card className="border-crimson/30 bg-crimson/5 p-6">
              <p className="font-display text-lg font-semibold text-crimson-soft">
                Could not reach the Mantle RPC
              </p>
              <p className="mt-2 text-sm text-muted">
                The chain status read failed against{" "}
                <span className="font-mono text-foreground/80">{hostOf(env.rpcUrl)}</span>. Market
                prices below still load independently.
              </p>
              <button
                type="button"
                onClick={() => void network.refetch()}
                className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                Retry
              </button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Latest block"
                value={status.blockNumber.toString()}
                hint="Most recent height"
              />
              <Stat
                label="Gas price"
                value={`${formatGwei(status.gasPriceWei)} Gwei`}
                hint="Current network gas"
              />
              <Stat label="Chain ID" value={String(status.chainId)} hint={env.appName} />
              <Stat
                label="RPC endpoint"
                value={
                  <span className="flex items-center gap-2">
                    <LiveDot />
                    <span className="font-mono text-base">{hostOf(env.rpcUrl)}</span>
                  </span>
                }
                hint="Connected"
              />
            </div>
          )}

          <div className="mt-4">
            <Link
              href={env.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-gold transition-colors hover:text-gold/80"
            >
              Open block explorer
              <span aria-hidden>↗</span>
            </Link>
          </div>
        </section>

        <section>
          <SectionHeading title="Market prices" hint="Live USD, refreshes every 60s" />

          {prices.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-8 w-8" />
            </div>
          ) : prices.isError || !priceMap ? (
            <Card className="border-crimson/30 bg-crimson/5 p-6">
              <p className="font-display text-lg font-semibold text-crimson-soft">
                Could not load market prices
              </p>
              <p className="mt-2 text-sm text-muted">
                The price feed is temporarily unavailable. Chain status above is unaffected.
              </p>
            </Card>
          ) : symbols.length === 0 ? (
            <Card className="p-6 text-center text-muted">No token prices available.</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {symbols.map((symbol) => {
                const entry = priceMap[symbol];
                if (!entry) return null;
                return (
                  <Card key={symbol} interactive className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base font-semibold text-foreground">
                          {symbol}
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold text-foreground">
                          {formatPrice(entry.usd)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-muted">24h</p>
                        <ChangeBadge change={entry.usd24hChange} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}
