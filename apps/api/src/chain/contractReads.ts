import type { Address } from "viem";
import type { Agent, Decision, Reputation, Task, Skill, StakingOverview } from "@spartarena/sdk";
import { UpstreamError } from "../lib/errors.js";
import { childLogger } from "../lib/logger.js";
import { getReadClient } from "./client.js";

/**
 * Thin, error-wrapped read helpers over the SDK client.
 *
 * Each helper returns `undefined` when chain reads are unconfigured (no
 * addresses), so callers can blend on-chain truth with the Postgres mirror
 * without branching everywhere. Genuine RPC/contract failures surface as
 * {@link UpstreamError} for the global error handler to map to a 502.
 */
const log = childLogger("chain.reads");

async function guard<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.error({ err, label }, "Chain read failed");
    throw new UpstreamError(`Chain read failed: ${label}`);
  }
}

export async function readAgent(agentId: bigint): Promise<Agent | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getAgent", () => client.getAgent(agentId));
}

export async function readAgentCount(): Promise<bigint | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getAgentCount", () => client.getAgentCount());
}

export async function readAgentsOf(
  owner: Address,
): Promise<readonly bigint[] | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getAgentsOf", () => client.getAgentsOf(owner));
}

export async function readTask(taskId: bigint): Promise<Task | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getTask", () => client.getTask(taskId));
}

export async function readTaskCount(): Promise<bigint | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getTaskCount", () => client.getTaskCount());
}

export async function readDecision(
  decisionId: bigint,
): Promise<Decision | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getDecision", () => client.getDecision(decisionId));
}

export async function readDecisionsOfAgent(
  agentId: bigint,
): Promise<readonly bigint[] | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getDecisionsOfAgent", () => client.getDecisionsOfAgent(agentId));
}

export async function readDecisionsOfTask(
  taskId: bigint,
): Promise<readonly bigint[] | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getDecisionsOfTask", () => client.getDecisionsOfTask(taskId));
}

export async function readReputation(
  agentId: bigint,
): Promise<Reputation | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getReputation", () => client.getReputation(agentId));
}

export async function readSkills(): Promise<readonly Skill[] | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getSkills", () => client.getSkills());
}

export async function readBond(agentId: bigint): Promise<bigint | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getBond", () => client.getBond(agentId));
}

export async function readAgentActive(agentId: bigint): Promise<boolean | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("isAgentActive", () => client.isAgentActive(agentId));
}

export async function readStakingOverview(): Promise<StakingOverview | undefined> {
  const client = getReadClient();
  if (!client) return undefined;
  return guard("getStakingOverview", () => client.getStakingOverview());
}
