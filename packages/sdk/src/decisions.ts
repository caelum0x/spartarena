import type { Address, Hex } from "viem";
import { decisionLedgerAbi } from "./abis.js";
import type {
  Decision,
  RecordDecisionParams,
  SpartArenaPublicClient,
  SpartArenaWalletClient,
} from "./types.js";

/**
 * DecisionLedger helpers (the "War Chronicle"). `recordDecision` is restricted
 * to the configured writer wallet on-chain; the simulate step will surface that
 * authorisation revert before a transaction is signed.
 */

export async function getDecision(
  publicClient: SpartArenaPublicClient,
  address: Address,
  decisionId: bigint,
): Promise<Decision> {
  const decision = await publicClient.readContract({
    address,
    abi: decisionLedgerAbi,
    functionName: "getDecision",
    args: [decisionId],
  });
  return {
    id: decision.id,
    agentId: decision.agentId,
    taskId: decision.taskId,
    promptHash: decision.promptHash,
    outputHash: decision.outputHash,
    toolsHash: decision.toolsHash,
    confidence: decision.confidence,
    riskScore: decision.riskScore,
    actionType: decision.actionType,
    timestamp: decision.timestamp,
  };
}

export async function getDecisionCount(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address,
    abi: decisionLedgerAbi,
    functionName: "decisionCount",
  });
}

export async function getDecisionsOfAgent(
  publicClient: SpartArenaPublicClient,
  address: Address,
  agentId: bigint,
): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address,
    abi: decisionLedgerAbi,
    functionName: "decisionsOfAgent",
    args: [agentId],
  });
}

export async function getDecisionsOfTask(
  publicClient: SpartArenaPublicClient,
  address: Address,
  taskId: bigint,
): Promise<readonly bigint[]> {
  return publicClient.readContract({
    address,
    abi: decisionLedgerAbi,
    functionName: "decisionsOfTask",
    args: [taskId],
  });
}

export async function recordDecision(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: RecordDecisionParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: decisionLedgerAbi,
    functionName: "recordDecision",
    args: [
      params.agentId,
      params.taskId,
      params.promptHash,
      params.outputHash,
      params.toolsHash,
      params.confidence,
      params.riskScore,
      params.actionType,
    ],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}
