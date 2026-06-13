import { createPublicClient, http, type PublicClient } from "viem";
import { getChainById, mantleSepolia } from "@spartarena/sdk";
import { env } from "../env.js";

/**
 * Shared viem public client for chain reads.
 *
 * Resolved once from the validated env: the chain definition comes from the SDK
 * (so RPC/explorer metadata stays consistent) and the transport URL is overridden
 * with the configured `RPC_URL`. Unknown chain ids fall back to Mantle Sepolia.
 */
function resolveChain() {
  return getChainById(env.CHAIN_ID) ?? mantleSepolia;
}

export const publicClient: PublicClient = createPublicClient({
  chain: resolveChain(),
  transport: http(env.RPC_URL),
});

/** The chain id this client is bound to. */
export const chainId: number = resolveChain().id;
