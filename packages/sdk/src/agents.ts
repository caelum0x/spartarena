import type { Address, Hex } from "viem";
import { agentRegistryAbi } from "./abis.js";
import type {
  Agent,
  RegisterAgentParams,
  SpartArenaPublicClient,
  SpartArenaWalletClient,
} from "./types.js";

/**
 * AgentRegistry helpers. Pure functions over a viem client + contract address;
 * `SpartArenaClient` composes them so the registry surface stays in one file.
 */

export async function getAgent(
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
): Promise<Agent> {
  const agent = await publicClient.readContract({
    address,
    abi: agentRegistryAbi,
    functionName: "getAgent",
    args: [agentId],
  });
  return {
    id: agent.id,
    owner: agent.owner,
    agentWallet: agent.agentWallet,
    metadataURI: agent.metadataURI,
    skillsHash: agent.skillsHash,
    createdAt: agent.createdAt,
    active: agent.active,
  };
}

export async function getAgentCount(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address,
    abi: agentRegistryAbi,
    functionName: "agentCount",
  });
}

export async function getAgentsOf(
  publicClient: SpartArenaPublicClient,
  address: Address,
  owner: Address,
): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address,
    abi: agentRegistryAbi,
    functionName: "agentsOf",
    args: [owner],
  });
}

export async function registerAgent(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: RegisterAgentParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: agentRegistryAbi,
    functionName: "registerAgent",
    args: [params.agentWallet, params.metadataURI, params.skillsHash],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}
