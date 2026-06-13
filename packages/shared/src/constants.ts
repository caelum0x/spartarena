/**
 * Chain-level constants for SpartArena.
 *
 * SpartArena settles on Mantle. The default public deployment target is Mantle
 * Sepolia (chainId 5003); local development uses an anvil node (chainId 31337).
 * All values here are derived from the official Mantle docs and the local
 * Foundry/anvil defaults so that api, web and sdk share one source of truth.
 */

export const APP_NAME = "SpartArena" as const;

export const APP_TAGLINE =
  "The on-chain arena where AI agents fight for jobs, earn rewards, and build verifiable reputation on Mantle." as const;

/** Mantle Sepolia testnet chain id. */
export const MANTLE_SEPOLIA_CHAIN_ID = 5003 as const;

/** Local anvil/hardhat development chain id. */
export const LOCAL_CHAIN_ID = 31337 as const;

/** The full set of chain ids SpartArena understands. */
export type SupportedChainId =
  | typeof MANTLE_SEPOLIA_CHAIN_ID
  | typeof LOCAL_CHAIN_ID;

export const SUPPORTED_CHAIN_IDS: readonly SupportedChainId[] = [
  MANTLE_SEPOLIA_CHAIN_ID,
  LOCAL_CHAIN_ID,
] as const;

/** Default chain used when none is specified. */
export const DEFAULT_CHAIN_ID: SupportedChainId = MANTLE_SEPOLIA_CHAIN_ID;

/** Native token metadata. Mantle's native token is MNT with 18 decimals. */
export const NATIVE_CURRENCY = {
  name: "Mantle",
  symbol: "MNT",
  decimals: 18,
} as const;

export interface ChainInfo {
  readonly id: SupportedChainId;
  readonly name: string;
  readonly rpcUrl: string;
  /** Block explorer base URL without a trailing slash. Empty for local chains. */
  readonly explorerUrl: string;
  readonly nativeCurrency: typeof NATIVE_CURRENCY;
  readonly testnet: boolean;
}

export const CHAINS: Readonly<Record<SupportedChainId, ChainInfo>> = {
  [MANTLE_SEPOLIA_CHAIN_ID]: {
    id: MANTLE_SEPOLIA_CHAIN_ID,
    name: "Mantle Sepolia",
    rpcUrl: "https://rpc.sepolia.mantle.xyz",
    explorerUrl: "https://sepolia.mantlescan.xyz",
    nativeCurrency: NATIVE_CURRENCY,
    testnet: true,
  },
  [LOCAL_CHAIN_ID]: {
    id: LOCAL_CHAIN_ID,
    name: "Anvil Local",
    rpcUrl: "http://127.0.0.1:8545",
    explorerUrl: "",
    nativeCurrency: NATIVE_CURRENCY,
    testnet: true,
  },
} as const;

/** Type guard narrowing an arbitrary number to a SupportedChainId. */
export function isSupportedChainId(
  chainId: number,
): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}

/**
 * Returns the {@link ChainInfo} for a chain id, falling back to the default
 * chain when the id is not recognised. Never throws so it is safe in UI render
 * paths; callers that need strictness should guard with {@link isSupportedChainId}.
 */
export function getChainInfo(chainId: number): ChainInfo {
  return isSupportedChainId(chainId)
    ? CHAINS[chainId]
    : CHAINS[DEFAULT_CHAIN_ID];
}

/** Returns the RPC URL for the given chain id. */
export function rpcUrl(chainId: number): string {
  return getChainInfo(chainId).rpcUrl;
}

/** Returns the explorer base URL for the given chain id (may be empty). */
export function explorerUrl(chainId: number): string {
  return getChainInfo(chainId).explorerUrl;
}

/**
 * Builds a block-explorer transaction URL for the given chain.
 * Returns an empty string when the chain has no explorer (e.g. local anvil).
 */
export function explorerTx(chainId: number, txHash: string): string {
  const base = explorerUrl(chainId);
  return base ? `${base}/tx/${txHash}` : "";
}

/**
 * Builds a block-explorer address URL for the given chain.
 * Returns an empty string when the chain has no explorer (e.g. local anvil).
 */
export function explorerAddress(chainId: number, address: string): string {
  const base = explorerUrl(chainId);
  return base ? `${base}/address/${address}` : "";
}
