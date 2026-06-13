"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Spinner } from "@/components/ui/Spinner";
import { ByrealTabs } from "@/components/byreal/ByrealTabs";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { api } from "@/lib/api";
import { formatUsd, pct1 } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Quote-token trade sizes (in quote units) probed against the real router. */
const SIZES = [100, 1000, 5000, 25000, 100000] as const;
/** Smallest / largest probed trade size, hoisted so they're never `undefined`. */
const MIN_SIZE = SIZES[0]!;
const MAX_SIZE = SIZES[SIZES.length - 1]!;
/** Slippage tolerance applied to every probe quote. */
const PROBE_SLIPPAGE_BPS = 50;
/** Depth headline threshold: largest size tradeable under this impact. */
const LOW_IMPACT_PCT = 1;

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

const STABLE_HINTS = ["USDC", "USDT"] as const;

/** Params captured when the user clicks "Probe depth". */
interface ProbeParams {
  readonly sellMint: string;
  readonly quoteMint: string;
}

/** One successful router probe at a given quote-token trade size. */
interface DepthPoint {
  readonly size: number;
  readonly priceImpactPct: number;
  readonly expectedAmountOut: string;
  readonly executionPrice: number;
}

/** Tailwind text color for a price-impact value: green → gold → crimson. */
function impactColor(impactPct: number): string {
  if (impactPct < 1) return "text-success";
  if (impactPct < 5) return "text-gold";
  return "text-crimson-soft";
}

/** Probe every size in parallel; skip (drop) any size whose quote fails. */
async function probeDepth(params: ProbeParams): Promise<readonly DepthPoint[]> {
  const settled = await Promise.all(
    SIZES.map(async (size): Promise<DepthPoint | null> => {
      try {
        const quote = await api.previewByrealSwap({
          tokenIn: params.quoteMint,
          tokenOut: params.sellMint,
          amountIn: String(size),
          slippageBps: PROBE_SLIPPAGE_BPS,
        });
        return {
          size,
          priceImpactPct: quote.priceImpactPct,
          expectedAmountOut: quote.expectedAmountOut,
          executionPrice: quote.executionPrice,
        };
      } catch {
        return null;
      }
    }),
  );
  return settled.filter((point): point is DepthPoint => point !== null);
}

export default function ByrealDepthPage() {
  const { data: tokenData, isLoading: tokensLoading, isError: tokensError } = useByrealTokens();
  const tokens = useMemo(() => tokenData?.data ?? [], [tokenData]);

  const [sellMint, setSellMint] = useState("");
  const [quoteMint, setQuoteMint] = useState("");
  const [params, setParams] = useState<ProbeParams | null>(null);

  // Seed defaults once the real token list loads: sell = highest-volume
  // non-stable token; quote = a stablecoin (USDC/USDT) when findable.
  useEffect(() => {
    if (tokens.length < 2 || sellMint !== "" || quoteMint !== "") return;

    const isStable = (symbol: string): boolean =>
      STABLE_HINTS.some((hint) => symbol.toUpperCase().includes(hint));

    const nonStable = tokens.filter((t) => !isStable(t.symbol));
    const topNonStable = [...nonStable].sort((a, b) => b.volume24hUsd - a.volume24hUsd)[0];
    const seedSell = topNonStable?.mint ?? tokens[0]!.mint;

    const stable = tokens.find((t) => isStable(t.symbol) && t.mint !== seedSell);
    let seedQuote = stable?.mint ?? tokens[1]!.mint;
    if (seedQuote === seedSell) seedQuote = tokens.find((t) => t.mint !== seedSell)!.mint;

    setSellMint(seedSell);
    setQuoteMint(seedQuote);
  }, [tokens, sellMint, quoteMint]);

  const symbolOf = useMemo(() => {
    const map = new Map(tokens.map((t) => [t.mint, t.symbol]));
    return (mint: string): string => map.get(mint) ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  }, [tokens]);

  const {
    data: points,
    isFetching,
    isError,
    error,
  } = useQuery<readonly DepthPoint[]>({
    queryKey: ["byreal", "depth", params?.sellMint, params?.quoteMint],
    queryFn: () => probeDepth(params!),
    enabled: params !== null,
    retry: false,
  });

  const canProbe = sellMint !== "" && quoteMint !== "" && sellMint !== quoteMint;

  const onProbe = (): void => {
    if (!canProbe) return;
    setParams({ sellMint, quoteMint });
  };

  const resetParams = (): void => setParams(null);

  // Headline read: largest probed size that stayed under the low-impact bound.
  const maxLowImpactSize = useMemo(() => {
    if (!points || points.length === 0) return null;
    const under = points.filter((p) => p.priceImpactPct < LOW_IMPACT_PCT);
    if (under.length === 0) return null;
    return under.reduce((max, p) => (p.size > max ? p.size : max), 0);
  }, [points]);

  const worstImpact = useMemo(() => {
    if (!points || points.length === 0) return null;
    return points.reduce((max, p) => Math.max(max, p.priceImpactPct), 0);
  }, [points]);

  const maxImpactForBar = Math.max(worstImpact ?? 0, 0.0001);

  const verdict = useMemo(() => {
    if (worstImpact === null) return null;
    // A market is "deep" if even the largest probed size stays under the bound.
    if (maxLowImpactSize === MAX_SIZE) {
      return { tone: "success" as const, text: "Deep, low-slippage market" };
    }
    if (worstImpact >= 10) {
      return { tone: "crimson" as const, text: "Thin — large trades move the price hard" };
    }
    return { tone: "gold" as const, text: "Moderate depth — size your trades with care" };
  }, [worstImpact, maxLowImpactSize]);

  return (
    <Container className="py-12">
      <PageHeader
        eyebrow="Byreal Liquidity"
        title="Liquidity Depth"
        description="Probe the REAL Byreal (Solana) router across rising trade sizes to gauge slippage and depth — how far the price moves as you buy more. Preview only: no execution."
      />

      <ByrealTabs />

      {tokensError ? (
        <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-10 text-center text-crimson-soft">
          Could not load Byreal tokens to probe.
        </div>
      ) : tokensLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Card className="flex h-fit flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted">
                Sell token
              </label>
              <select
                className={SELECT_CLASS}
                value={sellMint}
                onChange={(e) => {
                  setSellMint(e.target.value);
                  resetParams();
                }}
                aria-label="Sell token"
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
                Priced in (quote)
              </label>
              <select
                className={SELECT_CLASS}
                value={quoteMint}
                onChange={(e) => {
                  setQuoteMint(e.target.value);
                  resetParams();
                }}
                aria-label="Quote token"
              >
                {tokens.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs leading-relaxed text-muted">
              Probes {SIZES.length} buys of {symbolOf(sellMint)} using {formatUsd(MIN_SIZE)}–
              {formatUsd(MAX_SIZE)} of {symbolOf(quoteMint)} at{" "}
              {(PROBE_SLIPPAGE_BPS / 100).toFixed(1)}% slippage.
            </p>

            <button
              type="button"
              onClick={onProbe}
              disabled={!canProbe || isFetching}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                canProbe && !isFetching
                  ? "bg-gold text-background hover:bg-gold/90"
                  : "cursor-not-allowed bg-surface-2 text-muted",
              )}
            >
              {isFetching ? "Probing…" : sellMint === quoteMint ? "Pick two different tokens" : "Probe depth"}
            </button>

            <Link href="/byreal/swap" className="text-center text-xs text-muted hover:text-gold">
              Need a single quote? Open Swap Preview →
            </Link>
          </Card>

          <div>
            {params === null ? (
              <Card className="flex h-full min-h-[18rem] items-center justify-center text-center text-muted">
                Pick a token and a quote, then probe how price impact grows with trade size.
              </Card>
            ) : isError ? (
              <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
                Could not probe router depth.
                {error instanceof Error && (
                  <span className="mt-1 block text-sm text-muted">{error.message}</span>
                )}
              </Card>
            ) : isFetching || !points ? (
              <Card className="flex h-full min-h-[18rem] items-center justify-center">
                <Spinner className="h-6 w-6" />
              </Card>
            ) : points.length === 0 ? (
              <Card className="border-crimson/30 bg-crimson/5 text-center text-crimson-soft">
                The router returned no quotes for any probed size on this pair.
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label={`Tradeable under ${LOW_IMPACT_PCT}% impact`}
                    value={maxLowImpactSize !== null ? formatUsd(maxLowImpactSize) : "—"}
                    hint={maxLowImpactSize !== null ? `of ${symbolOf(quoteMint)}` : "even the smallest size moved >1%"}
                  />
                  <Stat
                    label="Worst impact probed"
                    value={
                      worstImpact !== null ? (
                        <span className={impactColor(worstImpact)}>{pct1(worstImpact)}</span>
                      ) : (
                        "—"
                      )
                    }
                    hint={`at ${formatUsd(MAX_SIZE)}`}
                  />
                  <Stat
                    label="Sizes quoted"
                    value={`${points.length}/${SIZES.length}`}
                    hint={points.length < SIZES.length ? "some sizes had no route" : "full depth curve"}
                  />
                </div>

                {verdict && (
                  <div>
                    <Badge tone={verdict.tone}>{verdict.text}</Badge>
                  </div>
                )}

                <Card className="flex flex-col gap-1 p-4">
                  <div className="mb-2 grid grid-cols-[7rem_1fr_5rem] items-center gap-3 px-1 text-xs uppercase tracking-wider text-muted">
                    <span>Trade size</span>
                    <span>Price impact</span>
                    <span className="text-right">Impact</span>
                  </div>
                  {points.map((point) => {
                    const widthPct = Math.min(
                      100,
                      (point.priceImpactPct / maxImpactForBar) * 100,
                    );
                    return (
                      <div
                        key={point.size}
                        className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 rounded-lg px-1 py-2"
                      >
                        <span className="font-display text-sm font-semibold text-foreground">
                          {formatUsd(point.size)}
                        </span>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              point.priceImpactPct < 1
                                ? "bg-success"
                                : point.priceImpactPct < 5
                                  ? "bg-gold"
                                  : "bg-crimson",
                            )}
                            style={{ width: `${Math.max(2, widthPct)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-right font-display text-sm font-semibold",
                            impactColor(point.priceImpactPct),
                          )}
                        >
                          {pct1(point.priceImpactPct)}
                        </span>
                      </div>
                    );
                  })}
                </Card>

                <Card className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                        <th className="px-4 py-3 font-medium">Spend ({symbolOf(quoteMint)})</th>
                        <th className="px-4 py-3 text-right font-medium">Price impact</th>
                        <th className="px-4 py-3 text-right font-medium">
                          Expected {symbolOf(sellMint)} out
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((point) => (
                        <tr key={point.size} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {formatUsd(point.size)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-semibold",
                              impactColor(point.priceImpactPct),
                            )}
                          >
                            {pct1(point.priceImpactPct)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground/80">
                            {point.expectedAmountOut}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
