import type { Address, Hex } from "viem";
import { agentStakingAbi } from "./abis.js";
import type { SpartArenaPublicClient, SpartArenaWalletClient } from "./types.js";

/**
 * AgentStaking helpers (the Spartan "war chest"). Reads return bond amounts in
 * wei; writes simulate first so reverts (not owner, insufficient bond, …)
 * surface before signing.
 */

export interface StakingOverview {
  readonly totalBonded: bigint;
  readonly minBond: bigint;
  readonly treasury: Address;
}

export async function getBond(
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
): Promise<bigint> {
  return publicClient.readContract({
    address,
    abi: agentStakingAbi,
    functionName: "bondOf",
    args: [agentId],
  });
}

export async function isAgentActive(
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
): Promise<boolean> {
  return publicClient.readContract({
    address,
    abi: agentStakingAbi,
    functionName: "isActive",
    args: [agentId],
  });
}

export async function getStakingOverview(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<StakingOverview> {
  const [totalBonded, minBond, treasury] = await Promise.all([
    publicClient.readContract({ address, abi: agentStakingAbi, functionName: "totalBonded" }),
    publicClient.readContract({ address, abi: agentStakingAbi, functionName: "minBond" }),
    publicClient.readContract({ address, abi: agentStakingAbi, functionName: "treasury" }),
  ]);
  return { totalBonded, minBond, treasury };
}

export async function stake(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
  valueWei: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: agentStakingAbi,
    functionName: "stake",
    args: [agentId],
    value: valueWei,
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function unstake(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
  amount: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: agentStakingAbi,
    functionName: "unstake",
    args: [agentId, amount],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function slash(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
  amount: bigint,
  reason: string,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: agentStakingAbi,
    functionName: "slash",
    args: [agentId, amount, reason],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}
