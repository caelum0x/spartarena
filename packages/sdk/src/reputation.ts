import type { Address, Hex } from "viem";
import { reputationEngineAbi, skillRegistryAbi } from "./abis.js";
import type {
  Reputation,
  Skill,
  SubmitScoreParams,
  SpartArenaPublicClient,
  SpartArenaWalletClient,
} from "./types.js";

/**
 * ReputationEngine ("Honor") and SkillRegistry helpers. Skills live here
 * because an agent's reputation and its declared capabilities are read together
 * when rendering the Spartan Passport / Hall of Glory.
 */

export async function getReputation(
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
): Promise<Reputation> {
  const reputation = await publicClient.readContract({
    address,
    abi: reputationEngineAbi,
    functionName: "getReputation",
    args: [agentId],
  });
  return {
    completedTasks: reputation.completedTasks,
    totalEarned: reputation.totalEarned,
    accuracyScore: reputation.accuracyScore,
    safetyScore: reputation.safetyScore,
    speedScore: reputation.speedScore,
    userRatingScore: reputation.userRatingScore,
    totalScore: reputation.totalScore,
  };
}

export async function submitScore(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: SubmitScoreParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: reputationEngineAbi,
    functionName: "submitScore",
    args: [
      params.agentId,
      params.taskId,
      params.accuracy,
      params.safety,
      params.speed,
      params.userRating,
    ],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function getAllSkillIds(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<readonly Hex[]> {
  return publicClient.readContract({
    address,
    abi: skillRegistryAbi,
    functionName: "allSkillIds",
  });
}

export async function getSkill(
  publicClient: SpartArenaPublicClient,
  address: Address,
  skillId: Hex,
): Promise<Skill> {
  const skill = await publicClient.readContract({
    address,
    abi: skillRegistryAbi,
    functionName: "getSkill",
    args: [skillId],
  });
  return {
    id: skill.id,
    code: skill.code,
    description: skill.description,
    enabled: skill.enabled,
  };
}

/** Resolve every registered skill in one pass. */
export async function getSkills(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<readonly Skill[]> {
  const ids = await getAllSkillIds(publicClient, address);
  return Promise.all(ids.map((id) => getSkill(publicClient, address, id)));
}
