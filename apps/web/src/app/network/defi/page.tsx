"use client";

import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "@/components/ui/Sparkline";
import { useMantleDefi } from "@/hooks/useMantleDefi";
import { formatUsd, pct1 } from "@/lib/format";

/** Signed 30-day TVL change badge, on-brand green / crimson. */
function ChangeBadge({ pctValue }: { pctValue: number }) {
  const positive = pctValue >= 0;
  const sign = positive ? "+" : "";
  return (
    <Badge tone={positive ? "success" : "crimson"}>
      {sign}
      {pct1(pctValue)}
    </Badge>
  );
}

/** Renders a nullable USD value, falling back to an em dash. */
function usdOrDash(value: number | null): string {
  return value === null ? "—" : formatUsd(value);
}

export default function NetworkDefiPage() {
  const defi = useMantleDefi();
  const data = defi.data;

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Mantle DeFi"
        description="A live snapshot of the Mantle DeFi ecosystem — total value locked and stablecoin circulation, sourced from DefiLlama."
      />

      <NetworkTabs />

      {defi.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : defi.isError || !data ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not load Mantle DeFi data
          </p>
          <p className="mt-2 text-sm text-muted">
            The DefiLlama feed is temporarily unavailable. Please try again shortly.
          </p>
          <button
            type="button"
            onClick={() => void defi.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Total TVL"
              value={
                <span className="flex items-center gap-2">
                  <span>{usdOrDash(data.tvlUsd)}</span>
                  {data.tvlChange30dPct !== null && (
                    <ChangeBadge pctValue={data.tvlChange30dPct} />
                  )}
                </span>
              }
              hint="Total value locked on Mantle"
            />
            <Stat
              label="Stablecoins circulating"
              value={usdOrDash(data.stablecoinsUsd)}
              hint="Pegged USD on Mantle"
            />
            <Stat
              label="30d trend"
              value={data.tvlChange30dPct === null ? "—" : `${data.tvlChange30dPct >= 0 ? "+" : ""}${pct1(data.tvlChange30dPct)}`}
              hint="Change in TVL over 30 days"
            />
          </div>

          <Card className="p-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">
                TVL (last 90 days)
              </h2>
              <span className="text-xs text-muted">Daily total value locked</span>
            </div>
            {data.tvlHistory.length >= 2 ? (
              <Sparkline data={data.tvlHistory} className="text-gold w-full" height={72} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                Not enough history to plot a trend.
              </p>
            )}
          </Card>

          <p className="text-xs text-muted">
            Source:{" "}
            <Link
              href="https://defillama.com/chain/Mantle"
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
