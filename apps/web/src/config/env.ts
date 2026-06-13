/**
 * Public runtime environment for the web app.
 *
 * Only `NEXT_PUBLIC_*` values are readable in the browser. Everything here is
 * resolved once and frozen so callers get a single, validated source of truth.
 *
 * The DEFAULT data path is REAL: the app talks to the live `@spartarena/api`
 * backend and reads/writes on-chain via configured contract addresses. Mock
 * fixtures are only served when `NEXT_PUBLIC_USE_MOCKS === 'true'` — never by
 * default. When the API is genuinely unreachable and mocks are off, callers
 * surface a real error / empty state rather than fabricating data.
 */

import { MANTLE_SEPOLIA_CHAIN_ID, type SupportedChainId } from "@spartarena/shared";

function readChainId(): SupportedChainId {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID;
  const parsed = raw ? Number.parseInt(raw, 10) : MANTLE_SEPOLIA_CHAIN_ID;
  if (parsed === 5003 || parsed === 31337) {
    return parsed as SupportedChainId;
  }
  return MANTLE_SEPOLIA_CHAIN_ID;
}

export interface PublicEnv {
  readonly appName: string;
  readonly appUrl: string;
  readonly apiUrl: string;
  readonly chainId: SupportedChainId;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly walletConnectProjectId: string | undefined;
  /**
   * When true, the API client serves rich mock fixtures instead of hitting the
   * real backend. Opt-in only (`NEXT_PUBLIC_USE_MOCKS=true`); false by default so
   * the production data path is real.
   */
  readonly useMocks: boolean;
}

export const env: PublicEnv = Object.freeze({
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "SpartArena",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  chainId: readChainId(),
  rpcUrl: process.env.NEXT_PUBLIC_MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz",
  explorerUrl:
    process.env.NEXT_PUBLIC_MANTLE_EXPLORER_URL ?? "https://sepolia.mantlescan.xyz",
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined,
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
});
