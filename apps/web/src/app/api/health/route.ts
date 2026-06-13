import { NextResponse } from "next/server";
import { APP_NAME } from "@spartarena/shared";
import { env } from "@/config/env";
import { hasContractAddresses } from "@/config/contracts";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness endpoint for the web app. Reports app metadata, the target
 * chain, whether on-chain writes are configured, and reachability of the
 * backend API (best-effort, never blocks longer than 2s).
 */
export async function GET() {
  let backendReachable = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${env.apiUrl}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    backendReachable = res.ok;
  } catch {
    backendReachable = false;
  }

  return NextResponse.json({
    success: true,
    data: {
      app: APP_NAME,
      status: "ok",
      chainId: env.chainId,
      writesEnabled: hasContractAddresses,
      backend: { url: env.apiUrl, reachable: backendReachable },
      timestamp: new Date().toISOString(),
    },
  });
}
