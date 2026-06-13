import { defineChain } from "viem";

/**
 * Mantle Sepolia testnet — SpartArena's primary public settlement and
 * reputation layer. Chain id, RPC and explorer come from the official Mantle
 * docs (chainId 5003, native token MNT with 18 decimals).
 */
export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://sepolia.mantlescan.xyz",
    },
  },
  testnet: true,
});

/**
 * Local Anvil/Foundry chain used for development and the deterministic local
 * deployment recorded at `packages/contracts/deployments/31337.json`.
 */
export const localAnvil = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
});

/** All chains the SDK ships first-class definitions for. */
export const spartArenaChains = {
  mantleSepolia,
  localAnvil,
} as const;

/** Chain ids the SDK recognises out of the box. */
export type SpartArenaChainId = (typeof spartArenaChains)[keyof typeof spartArenaChains]["id"];

/** Resolve a known SpartArena chain definition by its numeric id. */
export function getChainById(chainId: number) {
  if (chainId === mantleSepolia.id) return mantleSepolia;
  if (chainId === localAnvil.id) return localAnvil;
  return undefined;
}
