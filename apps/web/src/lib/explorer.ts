/**
 * Block-explorer link builders bound to the active chain. Wraps the shared
 * explorer helpers so components import a single, chain-aware module.
 */
import { explorerTx, explorerAddress, explorerUrl } from "@spartarena/shared";
import { env } from "@/config/env";

export function txUrl(txHash: string): string {
  return explorerTx(env.chainId, txHash);
}

export function addressUrl(address: string): string {
  return explorerAddress(env.chainId, address);
}

export function explorerBase(): string {
  return explorerUrl(env.chainId);
}
