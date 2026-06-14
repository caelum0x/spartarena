"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useByrealTokens } from "@/hooks/useByrealTokens";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface LiveQuoteProps {
  readonly mint: string;
  readonly symbol: string;
}

interface LiveQuoteData {
  readonly buyPrice: number | null;
  readonly sellPrice: number | null;
  readonly buyImpact: number;
  readonly sellImpact: number;
}

/** True when the value is a finite, strictly-positive number we can price with. */
function isUsablePrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Formats a USDC price with precision that adapts to its magnitude. */
function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US", {
    maximumFractionDigits: price >= 1 ? 2 : 6,
  })}`;
}

/**
 * Live buy/sell quote widget backed by REAL Byreal (Solana) router previews.
 *
 * Runs both directions of a `token ↔ USDC` swap through the same-origin
 * `/api/byreal/swap-preview` route to derive a live buy price, sell price, and
 * the spread between them. It is an optional, self-contained widget: if USDC
 * cannot be located, the token itself is USDC, or either quote is unusable, it
 * renders nothing rather than cluttering the page.
 */
export function LiveQuote({ mint, symbol }: LiveQuoteProps) {
  const { data: tokensResult } = useByrealTokens();
  const tokens = tokensResult?.data ?? [];

  const usdcToken =
    tokens.find((token) => token.symbol === "USDC") ??
    tokens.find((token) => token.symbol.toUpperCase().includes("USDC"));
  const usdcMint = usdcToken?.mint;

  const isUsdcPage = usdcMint !== undefined && usdcMint === mint;

  const { data, isLoading } = useQuery<LiveQuoteData>({
    queryKey: ["byreal", "live-quote", mint, usdcMint],
    enabled: usdcMint !== undefined && !isUsdcPage,
    retry: false,
    refetchInterval: 30_000,
    queryFn: async () => {
      const quoteUsdcMint = usdcMint as string;
      const [buyQuote, sellQuote] = await Promise.all([
        api.previewByrealSwap({
          tokenIn: quoteUsdcMint,
          tokenOut: mint,
          amountIn: "100",
          slippageBps: 50,
        }),
        api.previewByrealSwap({
          tokenIn: mint,
          tokenOut: quoteUsdcMint,
          amountIn: "1",
          slippageBps: 50,
        }),
      ]);

      const tokensFor100Usdc = Number(buyQuote.expectedAmountOut);
      const usdcFor1Token = Number(sellQuote.expectedAmountOut);

      const buyPrice = isUsablePrice(tokensFor100Usdc) ? 100 / tokensFor100Usdc : null;
      const sellPrice = isUsablePrice(usdcFor1Token) ? usdcFor1Token : null;

      return {
        buyPrice,
        sellPrice,
        buyImpact: buyQuote.priceImpactPct,
        sellImpact: sellQuote.priceImpactPct,
      };
    },
  });

  // Optional widget: hide entirely when USDC is unknown or the page token is USDC.
  if (usdcMint === undefined || isUsdcPage) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Live quote (Byreal)
        </h3>
        <div className="flex justify-center py-6">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    );
  }

  // On error or any unusable quote, render nothing — this is a non-critical widget.
  if (!data || data.buyPrice === null || data.sellPrice === null) {
    return null;
  }

  const { buyPrice, sellPrice, buyImpact, sellImpact } = data;
  const spreadPct = ((buyPrice - sellPrice) / sellPrice) * 100;
  const spreadTone = spreadPct >= 5 ? "crimson" : spreadPct >= 2 ? "gold" : "success";

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Live quote (Byreal)
        </h3>
        <Badge tone={spreadTone}>{spreadPct.toFixed(2)}% spread</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-success">Buy</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatPrice(buyPrice)}
          </p>
          <p className="mt-1 text-xs text-muted">via 100 USDC</p>
          <p className={cn("mt-0.5 text-xs", buyImpact >= 1 ? "text-crimson-soft" : "text-muted")}>
            {buyImpact.toFixed(2)}% impact
          </p>
        </div>

        <div className="rounded-xl border border-crimson/20 bg-crimson/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-crimson-soft">Sell</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {formatPrice(sellPrice)}
          </p>
          <p className="mt-1 text-xs text-muted">per 1 {symbol}</p>
          <p className={cn("mt-0.5 text-xs", sellImpact >= 1 ? "text-crimson-soft" : "text-muted")}>
            {sellImpact.toFixed(2)}% impact
          </p>
        </div>
      </div>
    </Card>
  );
}
