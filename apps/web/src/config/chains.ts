/**
 * Chain definitions used by wagmi/viem. Re-exports the SDK chain objects so the
 * web app, sdk and shared package all agree on chain ids, RPC and explorers.
 */
import { mantleSepolia, localAnvil } from "@spartarena/sdk";
import { env } from "./env";

export { mantleSepolia, localAnvil };

/** The chain this deployment targets, selected from NEXT_PUBLIC_CHAIN_ID. */
export const activeChain = env.chainId === 31337 ? localAnvil : mantleSepolia;

/** All chains the app advertises to a connected wallet. */
export const supportedChains = [mantleSepolia, localAnvil] as const;
