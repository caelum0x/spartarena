"use client";

import { use } from "react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stat } from "@/components/ui/Stat";
import { HashViewer } from "@/components/decisions/HashViewer";
import { useByrealToken } from "@/hooks/useByrealTokens";
import { useByrealPools } from "@/hooks/useByrealPools";
import { formatUsd, pct1 } from "@/lib/format";

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 1) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}

export default function ByrealTokenDetailPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const { data: token, isLoading, isError, error } = useByrealToken(mint);
  const { data: poolData } = useByrealPools();
  const relatedPools = (poolData?.data ?? []).filter(
    (p) => p.mintA === mint || p.mintB === mint,
  );

  if (isLoading) {
    return (
      <Container className="py-20">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </Container>
    );
  }

  if (isError || !token) {
    return (
      <Container className="py-12">
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load this Byreal token.
          {error instanceof Error && (
            <span className="mt-1 block text-sm text-muted">{error.message}</span>
          )}
          <div className="mt-5">
            <Link href="/byreal/tokens">
              <Button variant="secondary">Back to Tokens</Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const up = token.priceChange24hPct >= 0;
  const riskTone =
    token.riskScore >= 60 ? "crimson" : token.riskScore >= 35 ? "gold" : "success";

  return (
    <Container className="py-12">
      <div className="mb-6">
        <Link href="/byreal/tokens" className="text-sm text-muted hover:text-foreground">
          ← All Tokens
        </Link>
      </div>

      <PageHeader
        eyebrow={token.name}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {token.symbol}
            <Badge tone={riskTone}>Risk {Math.round(token.riskScore)}</Badge>
          </span>
        }
        description={token.reason}
        actions={
          <Link href={`/byreal/swap?tokenIn=${encodeURIComponent(token.mint)}`}>
            <Button>Swap {token.symbol}</Button>
          </Link>
        }
      />

      <p className="-mt-4 mb-6 break-all font-mono text-xs text-muted">{token.mint}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Price" value={formatPrice(token.priceUsd)} />
        <Stat
          label="24h change"
          value={
            <span className={up ? "text-success" : "text-crimson-soft"}>
              {up ? "+" : ""}
              {pct1(token.priceChange24hPct)}
            </span>
          }
        />
        <Stat label="24h Volume" value={formatUsd(token.volume24hUsd)} />
        <Stat
          label="Market cap"
          value={token.marketCapUsd !== null ? formatUsd(token.marketCapUsd) : "—"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="info">{Math.round(token.liquidityScore)} liquidity</Badge>
        <Badge tone={riskTone}>{Math.round(token.riskScore)} risk</Badge>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`https://solscan.io/token/${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="secondary">View on Solscan ↗</Button>
        </a>
        <Link href={`/byreal/swap?tokenIn=${encodeURIComponent(token.mint)}`}>
          <Button variant="ghost">Preview a swap</Button>
        </Link>
      </div>

      {relatedPools.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">
            Pools trading {token.symbol}
          </h2>
          <div className="grid gap-3">
            {relatedPools.map((pool) => (
              <Link key={pool.poolAddress} href={`/byreal/pools/${pool.poolAddress}`}>
                <Card interactive className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-foreground">{pool.pairLabel}</span>
                  <span className="flex items-center gap-4 text-sm text-muted">
                    <span>{formatUsd(pool.tvlUsd)} TVL</span>
                    <span className="text-gold">{pool.estimatedAprPct.toFixed(1)}% APR</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {token.proof && (
        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Discovery Proof</h2>
            {token.proof.recordedOnMantle && <Badge tone="gold">Recorded on Mantle</Badge>}
          </div>
          <Card>
            <HashViewer label="Decision proof" hash={token.proof.toolProofHash} />
          </Card>
        </section>
      )}
    </Container>
  );
}
