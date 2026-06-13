import type { Decision } from "@prisma/client";
import { NotFoundError } from "../../lib/errors.js";
import { buildMeta, type PaginationArgs } from "../../lib/pagination.js";
import type { ApiMeta } from "../../lib/errors.js";
import { resolveAgent } from "../agents/agents.service.js";
import {
  decisionsRepository,
  type DecisionFilter,
} from "./decisions.repository.js";

/**
 * Business logic for decisions (War Chronicle).
 *
 * Decisions are append-only proofs; this service only reads them and exposes the
 * full output JSON alongside the committed hashes so the UI can show both the
 * human explanation and the verifiable commitment.
 */

export interface DecisionDto {
  readonly id: string;
  readonly chainDecisionId: number | null;
  readonly chainTaskId: number | null;
  readonly chainAgentId: number | null;
  readonly taskId: string | null;
  readonly promptHash: string;
  readonly outputHash: string;
  readonly toolsHash: string;
  readonly confidence: number;
  readonly riskScore: number;
  readonly actionType: string;
  readonly txHash: string | null;
  readonly output: unknown;
  readonly createdAt: string;
}

export function toDecisionDto(decision: Decision): DecisionDto {
  return {
    id: decision.id,
    chainDecisionId: decision.chainDecisionId,
    chainTaskId: decision.chainTaskId,
    chainAgentId: decision.chainAgentId,
    taskId: decision.taskId,
    promptHash: decision.promptHash,
    outputHash: decision.outputHash,
    toolsHash: decision.toolsHash,
    confidence: decision.confidence,
    riskScore: decision.riskScore,
    actionType: decision.actionType,
    txHash: decision.txHash,
    output: decision.fullOutputJson,
    createdAt: decision.createdAt.toISOString(),
  };
}

export const decisionsService = {
  async list(
    filter: DecisionFilter,
    page: PaginationArgs,
  ): Promise<{ items: DecisionDto[]; meta: ApiMeta }> {
    const { rows, total } = await decisionsRepository.list(filter, page);
    return { items: rows.map(toDecisionDto), meta: buildMeta(total, page) };
  },

  async getById(id: string): Promise<DecisionDto> {
    const decision = /^\d+$/.test(id)
      ? ((await decisionsRepository.findByChainId(Number(id))) ??
        (await decisionsRepository.findById(id)))
      : await decisionsRepository.findById(id);
    if (!decision) throw new NotFoundError("Decision");
    return toDecisionDto(decision);
  },

  /** List decisions for a Spartan identified by cuid/slug/numeric chain id. */
  async listForAgent(
    agentIdentifier: string,
    page: PaginationArgs,
  ): Promise<{ items: DecisionDto[]; meta: ApiMeta }> {
    const agent = await resolveAgent(agentIdentifier);
    if (!agent) throw new NotFoundError("Spartan");
    const filter: DecisionFilter =
      agent.chainAgentId !== null ? { chainAgentId: agent.chainAgentId } : { chainAgentId: -1 };
    return this.list(filter, page);
  },
};
