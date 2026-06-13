import type { Log } from "viem";
import type { Prisma } from "@prisma/client";
import { SKILLS_BY_CODE } from "@spartarena/shared";
import { prisma } from "../../db.js";
import { childLogger } from "../../lib/logger.js";
import { agentsRepository } from "../agents/agents.repository.js";
import { tasksRepository } from "../tasks/tasks.repository.js";
import { decisionsRepository } from "../decisions/decisions.repository.js";
import { notificationService } from "../notifications/index.js";
import { slugify, withSuffix } from "../../lib/slug.js";

/**
 * Decoded-log handlers that upsert on-chain events into the Postgres mirror.
 *
 * Each handler is idempotent: it stores the raw event (deduplicated on
 * tx+logIndex) and upserts the domain row keyed by its on-chain id, so
 * re-scanning the same range is safe. Unknown decoded shapes are skipped rather
 * than throwing, keeping the poller resilient.
 */
const log = childLogger("indexer.handlers");

/** A viem-decoded log carrying an `eventName` and typed `args`. */
export type DecodedLog = Log & {
  eventName?: string;
  args?: Record<string, unknown>;
};

function asBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Persist the raw event row, deduplicated on (txHash, logIndex). */
async function recordEvent(
  contractName: string,
  eventName: string,
  l: DecodedLog,
): Promise<boolean> {
  const txHash = l.transactionHash;
  const logIndex = l.logIndex;
  const blockNumber = l.blockNumber;
  if (txHash === null || logIndex === null || blockNumber === null) return false;

  const payload: Prisma.InputJsonValue = JSON.parse(
    JSON.stringify(l.args ?? {}, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

  try {
    await prisma.event.create({
      data: {
        contractName,
        eventName,
        txHash,
        logIndex,
        blockNumber,
        payloadJson: payload,
      },
    });
    return true;
  } catch {
    // Unique violation → already processed; treat as a no-op.
    return false;
  }
}

async function handleAgentRegistered(l: DecodedLog): Promise<void> {
  const args = l.args ?? {};
  const agentId = asBigInt(args.agentId);
  const owner = asString(args.owner);
  const agentWallet = asString(args.agentWallet);
  const metadataURI = asString(args.metadataURI) ?? "";
  if (agentId === null || owner === null || agentWallet === null) return;

  const chainAgentId = Number(agentId);
  const existing = await agentsRepository.findByChainId(chainAgentId);
  if (existing) return; // already mirrored

  const baseName = `Spartan #${chainAgentId}`;
  let slug = slugify(baseName);
  if (await agentsRepository.findBySlug(slug)) slug = withSuffix(slug);

  await agentsRepository.upsertByChainId(
    chainAgentId,
    {
      chainAgentId,
      name: baseName,
      slug,
      ownerWallet: owner.toLowerCase(),
      agentWallet: agentWallet.toLowerCase(),
      metadataUri: metadataURI,
      status: "ACTIVE",
    },
    { ownerWallet: owner.toLowerCase(), agentWallet: agentWallet.toLowerCase() },
  );
}

async function handleTaskCreated(l: DecodedLog): Promise<void> {
  const args = l.args ?? {};
  const taskId = asBigInt(args.taskId);
  const creator = asString(args.creator);
  const reward = asBigInt(args.reward);
  const descriptionHash = asString(args.descriptionHash) ?? "";
  const deadline = asBigInt(args.deadline);
  if (taskId === null || creator === null || reward === null) return;

  const chainTaskId = Number(taskId);
  if (await tasksRepository.findByChainId(chainTaskId)) return;

  await tasksRepository.upsertByChainId(
    chainTaskId,
    {
      chainTaskId,
      title: `Battle #${chainTaskId}`,
      description: "(on-chain Battle — description stored off-chain)",
      descriptionHash,
      creatorWallet: creator.toLowerCase(),
      rewardAmount: reward.toString(),
      ...(deadline !== null ? { deadline } : {}),
      status: "OPEN",
    },
    { creatorWallet: creator.toLowerCase(), rewardAmount: reward.toString() },
  );
}

async function handleTaskStatus(
  l: DecodedLog,
  status: "ACCEPTED" | "SUBMITTED" | "VERIFIED" | "PAID" | "CANCELLED",
): Promise<void> {
  const taskId = asBigInt((l.args ?? {}).taskId);
  if (taskId === null) return;
  const chainTaskId = Number(taskId);
  const existing = await tasksRepository.findByChainId(chainTaskId);
  if (existing) await tasksRepository.update(existing.id, { status });

  // Announce when the Oracle Judge verifies a Battle (best-effort, never throws).
  if (status === "VERIFIED") {
    await notificationService.battleVerified({
      chainTaskId,
      ...(existing?.title ? { title: existing.title } : {}),
      ...(l.transactionHash ? { txHash: l.transactionHash } : {}),
    });
  }
}

/** A Spartan's bond was slashed — mirror nothing, just announce (best-effort). */
async function handleSlashed(l: DecodedLog): Promise<void> {
  const args = l.args ?? {};
  const agentId = asBigInt(args.agentId);
  const amount = asBigInt(args.amount);
  const newBond = asBigInt(args.newBond);
  const reason = asString(args.reason);
  if (agentId === null || amount === null || newBond === null) return;

  await notificationService.slashRecorded({
    chainAgentId: Number(agentId),
    amountWei: amount.toString(),
    newBondWei: newBond.toString(),
    ...(reason ? { reason } : {}),
    ...(l.transactionHash ? { txHash: l.transactionHash } : {}),
  });
}

async function handleDecisionRecorded(l: DecodedLog): Promise<void> {
  const args = l.args ?? {};
  const decisionId = asBigInt(args.decisionId);
  const agentId = asBigInt(args.agentId);
  const taskId = asBigInt(args.taskId);
  const promptHash = asString(args.promptHash) ?? "";
  const outputHash = asString(args.outputHash) ?? "";
  const toolsHash = asString(args.toolsHash) ?? "";
  const confidence = asBigInt(args.confidence);
  const riskScore = asBigInt(args.riskScore);
  const actionType = asString(args.actionType) ?? "OTHER";
  if (decisionId === null || agentId === null || taskId === null) return;

  const chainDecisionId = Number(decisionId);
  if (await decisionsRepository.findByChainId(chainDecisionId)) return;

  const known = [
    "ALPHA_ALERT",
    "RWA_STRATEGY",
    "GAS_OPTIMIZATION",
    "CONTRACT_AUDIT",
    "BYREAL_POOL_ANALYSIS",
    "OTHER",
  ];
  const action = known.includes(actionType) ? actionType : "OTHER";

  await decisionsRepository.upsertByChainId(
    chainDecisionId,
    {
      chainDecisionId,
      chainAgentId: Number(agentId),
      chainTaskId: Number(taskId),
      promptHash,
      outputHash,
      toolsHash,
      fullOutputJson: { source: "chain", txHash: l.transactionHash } as Prisma.InputJsonValue,
      confidence: confidence !== null ? Number(confidence) : 0,
      riskScore: riskScore !== null ? Number(riskScore) : 0,
      actionType: action as
        | "ALPHA_ALERT"
        | "RWA_STRATEGY"
        | "GAS_OPTIMIZATION"
        | "CONTRACT_AUDIT"
        | "BYREAL_POOL_ANALYSIS"
        | "OTHER",
      ...(l.transactionHash ? { txHash: l.transactionHash } : {}),
    },
    {},
  );
}

/** Dispatch one decoded log to its handler, recording the raw event first. */
export async function handleLog(
  contractName: string,
  l: DecodedLog,
): Promise<void> {
  const eventName = l.eventName;
  if (!eventName) return;

  const fresh = await recordEvent(contractName, eventName, l);
  if (!fresh) return; // already processed

  try {
    switch (eventName) {
      case "AgentRegistered":
        await handleAgentRegistered(l);
        break;
      case "TaskCreated":
        await handleTaskCreated(l);
        break;
      case "TaskAccepted":
        await handleTaskStatus(l, "ACCEPTED");
        break;
      case "ResultSubmitted":
        await handleTaskStatus(l, "SUBMITTED");
        break;
      case "TaskVerified":
        await handleTaskStatus(l, "VERIFIED");
        break;
      case "PaymentReleased":
        await handleTaskStatus(l, "PAID");
        break;
      case "TaskCancelled":
        await handleTaskStatus(l, "CANCELLED");
        break;
      case "DecisionRecorded":
        await handleDecisionRecorded(l);
        break;
      case "Slashed":
        await handleSlashed(l);
        break;
      default:
        // Reputation events are mirrored via getReputation reads on demand.
        break;
    }
  } catch (err) {
    log.error({ err, eventName }, "Event handler failed");
  }
}

/** Touch SKILLS_BY_CODE so the import is retained for future skill mirroring. */
export const KNOWN_SKILL_COUNT = Object.keys(SKILLS_BY_CODE).length;
