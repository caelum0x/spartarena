import { NextResponse } from "next/server";
import { ByrealRestClient, ByrealRequestError } from "@spartarena/byreal-adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Server-side Byreal LP-position lookup, exposed as `/api/byreal/positions`.
 *
 * Reads a wallet's REAL Byreal (Solana) liquidity positions server-side via the
 * shared {@link ByrealRestClient} — read-only. Position mutations (open,
 * increase, decrease, close) require signing a Solana transaction and are
 * Solana-side / out of scope. Works on Vercel with no separate backend and no
 * browser CORS.
 */

/** Solana base58 public key: 32-44 chars, base58 alphabet (no 0OIl). */
const OWNER_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** The flattened, render-ready shape returned to the client. */
interface ByrealPositionView {
  positionId: string;
  poolAddress: string | null;
  liquidity: string;
  valueUsd: number | null;
  feesUsd: number | null;
}

/** Parse a Byreal money string to a finite number, or null when absent/invalid. */
function toNumberOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const owner = new URL(request.url).searchParams.get("owner") ?? "";

  if (!OWNER_REGEX.test(owner)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "A valid Solana wallet address is required",
      },
      { status: 400 },
    );
  }

  try {
    const positions = await new ByrealRestClient().listPositions(owner);

    const data: ByrealPositionView[] = positions.map((p, index) => ({
      positionId: p.positionId ?? p.poolAddress ?? `position-${index}`,
      poolAddress: p.poolAddress ?? null,
      liquidity: p.liquidity ?? "0",
      valueUsd: toNumberOrNull(p.valueUsd),
      feesUsd: toNumberOrNull(p.feesUsd),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof ByrealRequestError
        ? `Byreal upstream error (${error.status ?? "network"})`
        : error instanceof Error
          ? error.message
          : "Failed to load Byreal positions";
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status: 502 },
    );
  }
}
