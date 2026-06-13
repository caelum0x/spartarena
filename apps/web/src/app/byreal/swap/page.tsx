"use client";

import { useEffect, useMemo, useState } from "react";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { HashViewer } from "@/components/decisions/HashViewer";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { useByrealSwapPreview, type SwapPreviewParams } from "@/hooks/useByrealSwap";
import { pct1 } from "@/lib/format";

const SLIPPAGE_OPTIONS = [10, 50, 100, 300] as const;
const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

export default function ByrealSwapPage() {
  const { data: tokenData, isLoading: tokensLoading, isError: tokensError } = useByrealTokens();
  const tokens = useMemo(() => tokenData?.data ?? [], [tokenData]);

  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("100");
  const [slippageBps, setSlippageBps] = useState<number>(50);
  const [params, setParams] = useState<SwapPreviewParams | null>(null);

  // Seed sensible defaults once the real token list loads, honoring an optional
  // `?tokenIn=<mint>` / `?tokenOut=<mint>` preset from a token card or pool page.
  useEffect(() => {
    if (tokens.length < 2 || tokenIn !== "" || tokenOut !== "") return;
    const mints = new Set(tokens.map((t) => t.mint));
    const search =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const wantIn = search?.get("tokenIn") ?? "";
    const wantOut = search?.get("tokenOut") ?? "";
    const seedIn = mints.has(wantIn) ? wantIn : tokens[0]!.mint;
    let seedOut = mints.has(wantOut) ? wantOut : tokens[1]!.mint;
    if (seedOut === seedIn) seedOut = tokens.find((t) => t.mint !== seedIn)!.mint;
    setTokenIn(seedIn);
    setTokenOut(seedOut);
  }, [tokens, tokenIn, tokenOut]);

  const symbolOf = useMemo(() => {
    const map = new Map(tokens.map((t) => [t.mint, t.symbol]));
    return (mint: string): string => map.get(mint) ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  }, [tokens]);

  const { data: quote, isFetching, isError, error } = useByrealSwapPreview(params);

  const amountValid = /^\d*\.?\d+$/.test(amountIn) && Number.parseFloat(amountIn) > 0;
  const canPreview = tokenIn !== "" && tokenOut !== "" && tokenIn !== tokenOut && amountValid;

  const onPreview = (): void => {
    if (!canPreview) return;
    setParams({ tokenIn, tokenOut, amountIn, slippageBps });
  };

  const flip = (): void => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setParams(null);
  };

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Swap Preview"
        description="Get a REAL Byreal (Solana) router quote — expected output, price impact, minimum received and route — backed by a verifiable proof hash. Preview only: execution requires a Solana wallet and is out of scope here."
      />

      <ByrealTabs />

      {tokensError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal tokens to swap.
        </div>
      ) : tokensLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                You pay
              </label>
              <div className="flex gap-2">
                <select
                  className={SELECT_CLASS}
                  value={tokenIn}
                  onChange={(e) => {
                    setTokenIn(e.target.value);
                    setParams(null);
                  }}
                  aria-label="Token in"
                >
                  {tokens.map((t) => (
                    <option key={t.mint} value={t.mint}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountIn}
                  onChange={(e) => {
                    setAmountIn(e.target.value);
                    setParams(null);
                  }}
                  className="max-w-[10rem]"
                  aria-label="Amount in"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={flip}
                aria-label="Swap direction"
                className="rounded-full border border-border bg-surface/60 p-2 text-muted transition-colors hover:text-gold"
              >
                ⇅
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                You receive
              </label>
              <select
                className={SELECT_CLASS}
                value={tokenOut}
                onChange={(e) => {
                  setTokenOut(e.target.value);
                  setParams(null);
                }}
                aria-label="Token out"
              >
                {tokens.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Max slippage
              </label>
              <div className="flex flex-wrap gap-2">
                {SLIPPAGE_OPTIONS.map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    onClick={() => {
                      setSlippageBps(bps);
                      setParams(null);
                    }}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                      (slippageBps === bps
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-surface/50 text-muted hover:text-foreground")
                    }
                  >
                    {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={onPreview} disabled={!canPreview} loading={isFetching}>
              {tokenIn === tokenOut ? "Pick two different tokens" : "Preview quote"}
            </Button>
          </Card>

          <div>
            {params === null ? (
              <Card className="flex h-full items-center justify-center text-center text-muted">
                Choose a pair and amount, then preview a real Byreal quote.
              </Card>
            ) : isError ? (
              <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
                Could not fetch a quote.
                {error instanceof Error && (
                  <span className="mt-1 block text-sm text-muted">{error.message}</span>
                )}
              </Card>
            ) : !quote ? (
              <Card className="flex h-full items-center justify-center">
                <Spinner className="h-6 w-6" />
              </Card>
            ) : (
              <Card className="flex flex-col gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted">
                    {quote.amountIn} {symbolOf(quote.tokenIn)} →
                  </p>
                  <p className="font-display text-3xl font-bold text-gradient-gold">
                    {quote.expectedAmountOut} {symbolOf(quote.tokenOut)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Price impact" value={pct1(quote.priceImpactPct)} />
                  <Stat label="Risk" value={`${Math.round(quote.riskScore)}/100`} />
                  <Stat
                    label="Min received"
                    value={`${quote.minAmountOut} ${symbolOf(quote.tokenOut)}`}
                  />
                  <Stat label="Hops" value={String(Math.max(0, quote.route.length - 1))} />
                </div>

                <p className="text-sm leading-relaxed text-foreground/80">{quote.humanSummary}</p>

                <div className="border-t border-border pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Swap Preview Proof
                    </p>
                    {quote.proof.recordedOnMantle && <Badge tone="gold">Recorded on Mantle</Badge>}
                  </div>
                  <HashViewer label="Decision proof" hash={quote.proof.toolProofHash} />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
