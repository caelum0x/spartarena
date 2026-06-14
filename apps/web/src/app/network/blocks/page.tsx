"use client";

import Link from "next/link";
import { timeAgo } from "@spartarena/shared";
import { Container, PageHeader } from "@/components/ui/Container";
import { NetworkTabs } from "@/components/network/NetworkTabs";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useRecentBlocks, type RecentBlock } from "@/hooks/useRecentBlocks";
import { env } from "@/config/env";
import { cn } from "@/lib/cn";

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

/** Gas utilization (0–100) for a block, guarding against a zero gas limit. */
function gasUtilization(block: RecentBlock): number {
  if (block.gasLimit <= 0n) return 0;
  // Compute in bigint-safe basis points, then convert to a float percentage.
  const bps = (block.gasUsed * 10_000n) / block.gasLimit;
  return Number(bps) / 100;
}

interface BlockSummary {
  readonly latest: string;
  readonly avgBlockTimeSec: number | null;
  readonly avgTxPerBlock: number;
  readonly avgGasUtilization: number;
}

/** Derive headline stats from the fetched blocks (newest first). */
function summarize(blocks: readonly RecentBlock[]): BlockSummary | null {
  const newest = blocks[0];
  if (!newest) return null;

  const latest = newest.number.toString();

  // Average block time from diffs of consecutive timestamps (newest → oldest).
  let avgBlockTimeSec: number | null = null;
  if (blocks.length > 1) {
    let totalDiff = 0;
    let samples = 0;
    for (let i = 0; i < blocks.length - 1; i += 1) {
      const current = blocks[i];
      const older = blocks[i + 1];
      if (!current || !older) continue;
      const diff = current.timestampSec - older.timestampSec;
      if (diff > 0) {
        totalDiff += diff;
        samples += 1;
      }
    }
    avgBlockTimeSec = samples > 0 ? totalDiff / samples : null;
  }

  const avgTxPerBlock =
    blocks.reduce((sum, b) => sum + b.txCount, 0) / blocks.length;

  const avgGasUtilization =
    blocks.reduce((sum, b) => sum + gasUtilization(b), 0) / blocks.length;

  return { latest, avgBlockTimeSec, avgTxPerBlock, avgGasUtilization };
}

/** A thin filled bar visualizing gas utilization for a block. */
function GasBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const hot = clamped >= 80;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            hot ? "bg-crimson" : "bg-gold",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs tabular-nums text-muted">
        {clamped.toFixed(1)}%
      </span>
    </div>
  );
}

export default function RecentBlocksPage() {
  const blocks = useRecentBlocks(10);
  const data = blocks.data ?? [];
  const summary = summarize(data);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Mantle"
        title="Recent Blocks"
        description="The latest blocks on the real Mantle chain — number, age, transaction count and gas utilization — read straight from the public RPC and refreshed live. No mock data."
        actions={
          <Badge tone="success">
            <LiveDot />
            <span className="ml-1">Live</span>
          </Badge>
        }
      />

      <NetworkTabs />

      {blocks.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : blocks.isError ? (
        <Card className="border-crimson/30 bg-crimson/5 p-6">
          <p className="font-display text-lg font-semibold text-crimson-soft">
            Could not reach the Mantle RPC
          </p>
          <p className="mt-2 text-sm text-muted">
            The recent-blocks read failed against{" "}
            <span className="font-mono text-foreground/80">
              {hostOf(env.rpcUrl)}
            </span>
            . The chain may be unreachable or the endpoint is temporarily down.
          </p>
          <button
            type="button"
            onClick={() => void blocks.refetch()}
            className="mt-4 inline-flex items-center rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
          >
            Retry
          </button>
        </Card>
      ) : data.length === 0 ? (
        <Card className="p-6 text-center text-muted">No blocks available.</Card>
      ) : (
        <div className="space-y-8">
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Latest block"
                value={summary.latest}
                hint="Most recent height"
              />
              <Stat
                label="Avg block time"
                value={
                  summary.avgBlockTimeSec === null
                    ? "—"
                    : `${summary.avgBlockTimeSec.toFixed(2)}s`
                }
                hint="Across recent blocks"
              />
              <Stat
                label="Avg tx / block"
                value={summary.avgTxPerBlock.toFixed(1)}
                hint="Transactions per block"
              />
              <Stat
                label="Avg gas used"
                value={`${summary.avgGasUtilization.toFixed(1)}%`}
                hint="Of gas limit"
              />
            </div>
          )}

          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs uppercase tracking-wider text-muted sm:grid">
              <div className="col-span-3">Block</div>
              <div className="col-span-3">Age</div>
              <div className="col-span-2 text-right">Txns</div>
              <div className="col-span-4 text-right">Gas used</div>
            </div>
            <ul className="divide-y divide-border">
              {data.map((block) => {
                const numberStr = block.number.toString();
                return (
                  <li
                    key={block.hash || numberStr}
                    className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface/40 sm:grid-cols-12 sm:items-center sm:gap-4"
                  >
                    <div className="col-span-3">
                      <Link
                        href={`${env.explorerUrl}/block/${numberStr}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm font-semibold text-gold transition-colors hover:text-gold/80"
                      >
                        #{numberStr}
                      </Link>
                    </div>
                    <div className="col-span-3 text-sm text-muted">
                      {timeAgo(block.timestampSec)}
                    </div>
                    <div className="col-span-2 text-sm tabular-nums text-foreground sm:text-right">
                      {block.txCount.toString()}
                    </div>
                    <div className="col-span-4 sm:flex sm:justify-end">
                      <GasBar pct={gasUtilization(block)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </Container>
  );
}
