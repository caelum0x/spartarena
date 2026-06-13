"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { getChainById, mantleSepolia } from "@spartarena/sdk";
import { env } from "@/config/env";

/**
 * Live "recent blocks" hook.
 *
 * Reads the REAL Mantle chain over its public JSON-RPC endpoint (no mock data).
 * A single module-level viem public client is shared across renders so we don't
 * spin up a new transport on every mount.
 */

const client = createPublicClient({
  chain: getChainById(env.chainId) ?? mantleSepolia,
  transport: http(env.rpcUrl),
});

export interface RecentBlock {
  /** Block height (raw bigint from the RPC). */
  readonly number: bigint;
  /** Block timestamp in unix seconds. */
  readonly timestampSec: number;
  /** Gas consumed by transactions in this block. */
  readonly gasUsed: bigint;
  /** Maximum gas allowed in this block. */
  readonly gasLimit: bigint;
  /** Number of transactions included in this block. */
  readonly txCount: number;
  /** Block hash. */
  readonly hash: string;
}

async function fetchRecentBlocks(count: number): Promise<RecentBlock[]> {
  const tip = await client.getBlockNumber();

  // Build the list of block numbers to fetch: tip, tip-1, … guarding against
  // going below zero (e.g. on a freshly-started / very short chain).
  const blockNumbers: bigint[] = [];
  for (let i = 0; i < count; i += 1) {
    const candidate = tip - BigInt(i);
    if (candidate < 0n) break;
    blockNumbers.push(candidate);
  }

  const blocks = await Promise.all(
    blockNumbers.map((blockNumber) =>
      client.getBlock({ blockNumber, includeTransactions: false }),
    ),
  );

  // Newest first (blockNumbers is already ordered tip → older).
  return blocks.map((block) => ({
    number: block.number ?? 0n,
    timestampSec: Number(block.timestamp),
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    txCount: block.transactions.length,
    hash: block.hash ?? "",
  }));
}

/** Live list of the most recent Mantle blocks (newest first), refreshed ~12s. */
export function useRecentBlocks(count = 10) {
  return useQuery<RecentBlock[]>({
    queryKey: ["recent-blocks", env.chainId, env.rpcUrl, count],
    queryFn: () => fetchRecentBlocks(count),
    refetchInterval: 12_000,
    retry: 1,
    staleTime: 6_000,
  });
}
