import {
  DEFAULT_CHAIN_ID,
  explorerAddress,
  explorerTx,
  explorerUrl,
  type SupportedChainId,
} from "../constants.js";

/**
 * Thin, ergonomic wrappers around the explorer URL builders in constants.ts.
 * Centralised here so api/web import block-explorer linking from `@spartarena/shared/utils`.
 */

export interface ExplorerLinks {
  /** Link to a transaction. */
  tx(txHash: string): string;
  /** Link to an address. */
  address(address: string): string;
  /** Base explorer URL (empty for local chains). */
  base(): string;
}

/**
 * Returns a bound set of explorer link builders for a chain. Useful when many
 * links are produced for the same chain (e.g. a transaction list view).
 */
export function explorerLinks(
  chainId: SupportedChainId = DEFAULT_CHAIN_ID,
): ExplorerLinks {
  return {
    tx: (txHash: string) => explorerTx(chainId, txHash),
    address: (address: string) => explorerAddress(chainId, address),
    base: () => explorerUrl(chainId),
  };
}

export { explorerTx, explorerAddress, explorerUrl };
