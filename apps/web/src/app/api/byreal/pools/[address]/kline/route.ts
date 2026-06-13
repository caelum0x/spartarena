import { NextResponse } from "next/server";
import { ByrealRestClient, ByrealRequestError } from "@spartarena/byreal-adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Same-origin price-history endpoint for a single Byreal pool, exposed as
 * `/api/byreal/pools/<address>/kline`.
 *
 * Byreal's pools LIST endpoint carries REAL price-history arrays per pool
 * (`kline7d` / `kline1d`). We pull a page of live pools server-side, locate the
 * requested pool by address, and return its price series with the window label.
 * This runs on Node (no browser CORS) and serves the sparkline on the pool
 * detail page. When a pool has no history we still succeed with an empty series.
 */

interface KlineResponse {
  readonly prices: number[];
  readonly window: string;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
  const { address } = await ctx.params;

  try {
    const pools = await new ByrealRestClient().listPools({ pageSize: 50 });
    const pool = pools.find((p) => p.poolAddress === address);

    if (!pool) {
      return NextResponse.json(
        { success: false, data: null, error: "Pool not found" },
        { status: 404 },
      );
    }

    const prices = pool.kline7d ?? pool.kline1d ?? [];
    const window = pool.kline7d ? "7d" : "1d";
    const data: KlineResponse = { prices, window };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "cache-control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to load Byreal price history";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 502 },
    );
  }
}
