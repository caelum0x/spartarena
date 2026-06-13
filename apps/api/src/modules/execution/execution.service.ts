import type { ActionType, Agent, Prisma, Task } from "@prisma/client";
import type { AgentOutput } from "@spartarena/shared";
import { hashDecision } from "../../lib/hash.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { childLogger } from "../../lib/logger.js";
import { canWriteChain } from "../../env.js";
import { prisma } from "../../db.js";
import { resolveAgent } from "../agents/agents.service.js";
import { resolveTask } from "../tasks/tasks.service.js";
import { tasksRepository } from "../tasks/tasks.repository.js";
import { decisionsRepository } from "../decisions/decisions.repository.js";
import { scoreOutput } from "../reputation/reputation.scorer.js";
import { notificationService } from "../notifications/index.js";
import { writeDecision, writeResult } from "../../chain/contractWrites.js";
import { hashJson } from "../../lib/hash.js";
import {
  actionTypeFor,
  generateDecision,
} from "./execution.agent.js";
import { InMemoryQueue } from "./execution.queue.js";
import type {
  AgentKind,
  ExecutionPrompt,
  ExecutionResult,
  ToolCall,
} from "./execution.types.js";
import type { RunDemoForAgentInput } from "./execution.schema.js";

/**
 * Execution service — the core.
 *
 * For each run it: (1) runs the real Spartan pipeline (real Mantle/market reads +
 * real LLM narration) to produce a structured decision, (2) hashes
 * prompt/output/tools, (3) scores it, (4) persists a Decision row, (5) when a
 * backend signer + addresses are present, commits the decision to DecisionLedger
 * and submits the result hash to TaskEscrow, and (6) fires notifications. When
 * chain writes are unavailable it still returns the full computed proof.
 *
 * Runs are funnelled through a sequential queue so nonce-sensitive chain writes
 * stay ordered.
 */
const log = childLogger("execution");

const DEFAULT_PROMPTS: Readonly<Record<AgentKind, string>> = {
  AlphaSentinel: "Detect suspicious wallet activity on Mantle and explain the risk.",
  YieldStrategist:
    "Recommend a conservative allocation across MNT, mETH and USDY for capital preservation with yield.",
};

interface RunInput {
  readonly agentKind: AgentKind;
  readonly agent: Agent | null;
  readonly task: Task | null;
  readonly description: string;
}

/** Map an action-type string to the Prisma enum, defaulting to OTHER. */
function toActionTypeEnum(value: string): ActionType {
  const known: readonly ActionType[] = [
    "ALPHA_ALERT",
    "RWA_STRATEGY",
    "GAS_OPTIMIZATION",
    "CONTRACT_AUDIT",
    "OTHER",
  ];
  return (known as readonly string[]).includes(value)
    ? (value as ActionType)
    : "OTHER";
}

async function performRun(input: RunInput): Promise<ExecutionResult> {
  const { agentKind, agent, task, description } = input;
  const startedAt = Date.now();

  const chainTaskId = task?.chainTaskId ?? 0;
  const chainAgentId = agent?.chainAgentId ?? 0;

  const prompt: ExecutionPrompt = { taskId: chainTaskId, agentKind, description };
  const { output, toolCalls } = await generateDecision(agentKind, chainTaskId, description, {
    ...(agent?.agentWallet ? { targetWallet: agent.agentWallet } : {}),
  });

  const hashes = hashDecision(prompt, output, toolCalls);
  const latencyMs = Date.now() - startedAt;
  const actionType = actionTypeFor(agentKind);

  // Persist the decision proof locally first (source for the UI even off-chain).
  const decisionData: Prisma.DecisionCreateInput = {
    chainTaskId: task?.chainTaskId ?? null,
    chainAgentId: agent?.chainAgentId ?? null,
    promptHash: hashes.promptHash,
    outputHash: hashes.outputHash,
    toolsHash: hashes.toolsHash,
    fullOutputJson: output as unknown as Prisma.InputJsonValue,
    confidence: output.confidence,
    riskScore: output.riskScore,
    actionType: toActionTypeEnum(actionType),
    ...(task?.id ? { task: { connect: { id: task.id } } } : {}),
  };
  const decisionRow = await decisionsRepository.create(decisionData);

  let chainDecisionId: number | null = null;
  let decisionTxHash: string | null = null;
  let resultTxHash: string | null = null;
  let onChain = false;

  if (canWriteChain() && agent?.chainAgentId !== undefined && agent?.chainAgentId !== null) {
    try {
      decisionTxHash = await writeDecision({
        agentId: BigInt(agent.chainAgentId),
        taskId: BigInt(chainTaskId),
        promptHash: hashes.promptHash,
        outputHash: hashes.outputHash,
        toolsHash: hashes.toolsHash,
        confidence: BigInt(output.confidence),
        riskScore: BigInt(output.riskScore),
        actionType,
      });
      onChain = true;

      // Commit the result hash to escrow when the Battle exists on-chain.
      if (task?.chainTaskId !== undefined && task?.chainTaskId !== null) {
        resultTxHash = await writeResult({
          taskId: BigInt(task.chainTaskId),
          agentId: BigInt(agent.chainAgentId),
          resultHash: hashes.outputHash,
        });
      }
    } catch (err) {
      log.warn({ err, decisionId: decisionRow.id }, "On-chain write failed; proof kept off-chain");
    }
  }

  if (decisionTxHash !== null) {
    await prisma.decision.update({
      where: { id: decisionRow.id },
      data: { txHash: decisionTxHash },
    });
  }

  // Advance the Battle to SUBMITTED locally when a result was produced.
  if (task) {
    await tasksRepository.update(task.id, {
      status: "SUBMITTED",
      ...(agent ? { assignedAgent: { connect: { id: agent.id } } } : {}),
    });
  }

  // Best-effort notification: a Spartan completed a Battle. A delivery failure
  // must never break the proof/chain-write flow, so we suppress any throw at the
  // call site rather than relying on the channel implementations staying safe.
  await notificationService
    .battleCompleted({
      agentName: agentKind,
      chainTaskId: task?.chainTaskId ?? null,
      confidence: output.confidence,
      riskScore: output.riskScore,
      onChain,
      decisionTxHash,
      resultTxHash,
    })
    .catch((err: unknown) => {
      log.warn({ err }, "battleCompleted notification failed; suppressing");
    });

  return {
    taskId: chainTaskId,
    agentKind,
    output,
    hashes,
    toolCalls,
    confidence: output.confidence,
    riskScore: output.riskScore,
    actionType,
    latencyMs,
    decisionId: decisionRow.id,
    chainDecisionId,
    decisionTxHash,
    resultTxHash,
    onChain,
  };
}

const runQueue = new InMemoryQueue<RunInput, ExecutionResult>("agent-run", performRun);

/** Infer which built-in persona an agent should run from its skills. */
function inferAgentKind(agent: Agent | null): AgentKind {
  if (agent?.skills.includes("RWA_STRATEGY")) return "YieldStrategist";
  return "AlphaSentinel";
}

/** Augment an ExecutionResult with derived scores for API responses. */
function withScores(result: ExecutionResult): ExecutionResult & {
  scores: ReturnType<typeof scoreOutput>;
} {
  return { ...result, scores: scoreOutput(result.output as AgentOutput, result.latencyMs) };
}

export const executionService = {
  /** Execute the agent assigned to a Battle (queues a run + writes proof). */
  async executeTask(taskIdentifier: string) {
    const task = await resolveTask(taskIdentifier);
    if (!task) throw new NotFoundError("Battle");

    const agent = task.assignedAgentId
      ? await resolveAgent(task.assignedAgentId)
      : null;
    if (!agent) {
      throw new ValidationError(
        "Battle has no assigned Spartan. Assign one before executing.",
      );
    }

    const result = await runQueue.enqueue({
      agentKind: inferAgentKind(agent),
      agent,
      task,
      description: task.description,
    });
    return withScores(result);
  },

  /** Run a demo for a specific registered Spartan. */
  async runDemoForAgent(agentIdentifier: string, input: RunDemoForAgentInput) {
    const agent = await resolveAgent(agentIdentifier);
    if (!agent) throw new NotFoundError("Spartan");

    const task = input.taskId ? await resolveTask(input.taskId) : null;
    const agentKind = inferAgentKind(agent);
    const description =
      input.description ?? task?.description ?? DEFAULT_PROMPTS[agentKind];

    const result = await runQueue.enqueue({ agentKind, agent, task, description });
    return withScores(result);
  },

  /**
   * Run a named built-in persona for the demo route, optionally against a Task.
   * Used by `/demo/run-alpha-agent` and `/demo/run-yield-agent`.
   */
  async runNamedAgent(
    agentKind: AgentKind,
    opts: { taskId?: string; description?: string },
  ) {
    const task = opts.taskId ? await resolveTask(opts.taskId) : null;
    // Try to bind a registered Spartan that advertises the matching skill.
    const agent = await findAgentForKind(agentKind);
    const description =
      opts.description ?? task?.description ?? DEFAULT_PROMPTS[agentKind];

    const result = await runQueue.enqueue({ agentKind, agent, task, description });
    return withScores(result);
  },

  /** Expose the prompt-hash preimage helper for transparency endpoints. */
  promptPreimageHash(prompt: ExecutionPrompt, toolCalls: readonly ToolCall[]): string {
    return hashJson({ prompt, toolCalls });
  },
};

/** Find a registered Spartan whose skills suit the persona, else null. */
async function findAgentForKind(agentKind: AgentKind): Promise<Agent | null> {
  const skill = agentKind === "YieldStrategist" ? "RWA_STRATEGY" : "ALPHA_DETECTION";
  return prisma.agent.findFirst({
    where: { skills: { has: skill } },
    orderBy: { createdAt: "asc" },
  });
}
