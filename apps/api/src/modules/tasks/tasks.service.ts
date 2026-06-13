import type { Task } from "@prisma/client";
import { TaskStatus as ChainTaskStatus } from "@spartarena/shared";
import { hashDescription } from "../../lib/hash.js";
import { NotFoundError } from "../../lib/errors.js";
import { buildMeta, type PaginationArgs } from "../../lib/pagination.js";
import type { ApiMeta } from "../../lib/errors.js";
import { readTaskCount } from "../../chain/contractReads.js";
import { tasksRepository, type TaskFilter } from "./tasks.repository.js";
import type { CreateTaskInput } from "./tasks.schema.js";

/**
 * Business logic for tasks (Battles).
 *
 * Serialises Prisma rows to a stable DTO (bigint/Date → string so JSON is
 * lossless) and resolves identifiers that may be a DB cuid or numeric chain id.
 */

export interface TaskDto {
  readonly id: string;
  readonly chainTaskId: number | null;
  readonly projectId: string | null;
  readonly title: string;
  readonly description: string;
  readonly descriptionHash: string;
  readonly requiredSkill: string | null;
  readonly creatorWallet: string;
  readonly assignedAgentId: string | null;
  readonly rewardWei: string;
  readonly status: string;
  readonly statusCode: number;
  readonly deadline: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const STATUS_TO_CODE: Readonly<Record<string, number>> = {
  OPEN: ChainTaskStatus.Open,
  ACCEPTED: ChainTaskStatus.Accepted,
  SUBMITTED: ChainTaskStatus.Submitted,
  VERIFIED: ChainTaskStatus.Verified,
  PAID: ChainTaskStatus.Paid,
  CANCELLED: ChainTaskStatus.Cancelled,
};

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    chainTaskId: task.chainTaskId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    descriptionHash: task.descriptionHash,
    requiredSkill: task.requiredSkill,
    creatorWallet: task.creatorWallet,
    assignedAgentId: task.assignedAgentId,
    rewardWei: task.rewardAmount,
    status: task.status,
    statusCode: STATUS_TO_CODE[task.status] ?? ChainTaskStatus.Open,
    deadline: task.deadline !== null ? task.deadline.toString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const tasksService = {
  async list(
    filter: TaskFilter,
    page: PaginationArgs,
  ): Promise<{ items: TaskDto[]; meta: ApiMeta }> {
    const { rows, total } = await tasksRepository.list(filter, page);
    return { items: rows.map(toTaskDto), meta: buildMeta(total, page) };
  },

  async getByIdentifier(identifier: string): Promise<TaskDto> {
    const task = await resolveTask(identifier);
    if (!task) throw new NotFoundError("Battle");
    return toTaskDto(task);
  },

  async create(input: CreateTaskInput): Promise<TaskDto> {
    const descriptionHash = hashDescription(input.description);
    const created = await tasksRepository.create({
      title: input.title,
      description: input.description,
      descriptionHash,
      ...(input.requiredSkill !== undefined ? { requiredSkill: input.requiredSkill } : {}),
      creatorWallet: input.creatorWallet.toLowerCase(),
      rewardAmount: input.rewardWei,
      deadline: BigInt(input.deadline),
      ...(input.chainTaskId !== undefined ? { chainTaskId: input.chainTaskId } : {}),
      ...(input.projectId !== undefined ? { project: { connect: { id: input.projectId } } } : {}),
    });
    return toTaskDto(created);
  },

  async sync(): Promise<{ onChainTaskCount: number | null }> {
    const count = await readTaskCount();
    return { onChainTaskCount: count !== undefined ? Number(count) : null };
  },
};

/** Resolve a task by DB cuid or numeric on-chain id. Exported for reuse. */
export async function resolveTask(identifier: string): Promise<Task | null> {
  if (/^\d+$/.test(identifier)) {
    const byChain = await tasksRepository.findByChainId(Number(identifier));
    if (byChain) return byChain;
  }
  return tasksRepository.findById(identifier);
}
