import type { Address, Hex } from "viem";
import { taskEscrowAbi } from "./abis.js";
import {
  TaskStatus,
  type AcceptTaskParams,
  type CreateTaskParams,
  type SubmitResultParams,
  type Task,
  type SpartArenaPublicClient,
  type SpartArenaWalletClient,
} from "./types.js";

/**
 * TaskEscrow helpers (the "Battle Vault"). Reads decode the raw tuple into a
 * typed {@link Task}; writes simulate first so reverts surface before signing.
 */

function toTaskStatus(raw: number): TaskStatus {
  if (raw < TaskStatus.Open || raw > TaskStatus.Cancelled) {
    throw new Error(`Unknown task status returned from chain: ${raw}`);
  }
  return raw as TaskStatus;
}

export async function getTask(
  publicClient: SpartArenaPublicClient,
  address: Address,
  taskId: bigint,
): Promise<Task> {
  const task = await publicClient.readContract({
    address,
    abi: taskEscrowAbi,
    functionName: "getTask",
    args: [taskId],
  });
  return {
    id: task.id,
    creator: task.creator,
    assignedAgentId: task.assignedAgentId,
    reward: task.reward,
    descriptionHash: task.descriptionHash,
    resultHash: task.resultHash,
    status: toTaskStatus(task.status),
    createdAt: task.createdAt,
    deadline: task.deadline,
  };
}

export async function getTaskCount(
  publicClient: SpartArenaPublicClient,
  address: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address,
    abi: taskEscrowAbi,
    functionName: "taskCount",
  });
}

export async function createTask(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: CreateTaskParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "createTask",
    args: [params.descriptionHash, params.deadline],
    value: params.rewardWei,
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function acceptTask(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: AcceptTaskParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "acceptTask",
    args: [params.taskId, params.agentId],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function submitResult(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  params: SubmitResultParams,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "submitResult",
    args: [params.taskId, params.agentId, params.resultHash],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function verifyTask(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  taskId: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "verifyTask",
    args: [taskId],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function releasePayment(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  taskId: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "releasePayment",
    args: [taskId],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}

export async function refundExpiredTask(
  walletClient: SpartArenaWalletClient,
  publicClient: SpartArenaPublicClient,
  address: Address,
  taskId: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address,
    abi: taskEscrowAbi,
    functionName: "refundExpiredTask",
    args: [taskId],
    account: walletClient.account,
  });
  return walletClient.writeContract(request);
}
