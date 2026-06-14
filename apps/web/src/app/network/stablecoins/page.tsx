"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import {
  useMantleStablecoins,
  type MantleStablecoinAsset,
} from "@/hooks/useMantleStablecoins";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Share of total as a percentage string with one decimal. */
function sharePct(value: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

interface AssetRowProps {
  readonly asset: MantleStablecoinAsset;
  readonly total: number;
  readonly max: number;
}

/** A single ranked stablecoin row: identity, circulation, share + bar, peg badge. */
function AssetRow({ asset, total, max }: AssetRowProps) {
  const barWidth = max > 0 ? Math.max(2, (asset.mantleUsd / max) * 100) : 0;
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold text-foreground">
            {asset.symbol}
          </span>
          <span className="text-sm text-muted">{asset.name}</span>
          {asset.pegType && (
            <Badge tone="muted" className="ml-1">
              {asset.pegType}
            </Badge>
          )}
        </div>
        <div className="text-right">
          <span className="font-display text-base font-semibold text-foreground">
            {formatUsd(asset.mantleUsd)}
          </span>
          <span className="ml-2 text-xs text-muted">
            {sharePct(asset.mantleUsd, total)}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full bg-gold")}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function NetworkStablecoinsPage() {
  const stables = useMantleStablecoins();
  const data = stables.data;

  const assets = data?.assets ?? [];
  const total = data?.totalUsd ?? 0;
  const max = assets.length > 0 ? assets[0]!.mantleUsd : 0;
  const dominant = assets.length > 0 ? assets[0]! : null;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Stablecoins"
        description="Stablecoin circulation on Mantle, broken down by asset with each asset's share of the total — sourced from DefiLlama."
      />

      <NetworkTabs />

      {stables.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : stables.isError || !data ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle stablecoin data
          </p>
          <p className="mt-2 text-sm text-muted">
            The DefiLlama feed is temporarily unavailable. Please try again shortly.
          </p>
          <button
            type="button"
            onClick={() => void stables.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : assets.length === 0 ? (
        <Card className="p-6">
          <p className="font-display text-lg font-semibold text-foreground">
            No stablecoins found on Mantle
          </p>
          <p className="mt-2 text-sm text-muted">
            DefiLlama is not reporting any stablecoin circulation on Mantle right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Total circulation"
              value={formatUsd(total)}
              hint="Stablecoins circulating on Mantle"
            />
            <Stat
              label="Assets"
              value={String(assets.length)}
              hint="Distinct stablecoins on Mantle"
            />
            <Stat
              label="Dominant asset"
              value={
                dominant ? (
                  <span className="flex items-center gap-2">
                    <span>{dominant.symbol}</span>
                    <Badge tone="gold">{sharePct(dominant.mantleUsd, total)}</Badge>
                  </span>
                ) : (
                  "—"
                )
              }
              hint="Largest share of circulation"
            />
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                Circulation by asset
              </h2>
              <span className="text-xs text-muted">Share of total on Mantle</span>
            </div>
            <div>
              {assets.map((asset) => (
                <AssetRow
                  key={`${asset.symbol}-${asset.name}`}
                  asset={asset}
                  total={total}
                  max={max}
                />
              ))}
            </div>
          </Card>

          <p className="text-xs text-muted">
            Source:{" "}
            <Link
              href="https://defillama.com/stablecoins/Mantle"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gold hover:underline"
            >
              DefiLlama
            </Link>
          </p>
        </div>
      )}
    </Container>
  );
}
