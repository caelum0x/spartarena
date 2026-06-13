"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { getChainById, mantleSepolia } from "@spartarena/sdk";
import { env } from "@/config/env";

/**
 * Live Mantle chain status hook.
 *
 * Reads the REAL Mantle chain over its public JSON-RPC endpoint (no mock data).
 * A single module-level viem public client is shared across renders so we don't
 * spin up a new transport on every mount.
 */

const client = createPublicClient({
  chain: getChainById(env.chainId) ?? mantleSepolia,
  transport: http(env.rpcUrl),
});

export interface MantleNetworkStatus {
  /** Height of the most recent block (raw bigint from the RPC). */
  readonly blockNumber: bigint;
  /** Current gas price in wei. */
  readonly gasPriceWei: bigint;
  /** Configured chain id (from public env). */
  readonly chainId: number;
}

async function fetchNetworkStatus(): Promise<MantleNetworkStatus> {
  const [blockNumber, gasPriceWei] = await Promise.all([
    client.getBlockNumber(),
    client.getGasPrice(),
  ]);
  return { blockNumber, gasPriceWei, chainId: env.chainId };
}

/** Live Mantle chain status (block height + gas price), refreshed every ~12s. */
export function useMantleNetwork() {
  return useQuery<MantleNetworkStatus>({
    queryKey: ["mantle-network", env.chainId, env.rpcUrl],
    queryFn: fetchNetworkStatus,
    refetchInterval: 12_000,
    retry: 1,
    staleTime: 6_000,
  });
}
