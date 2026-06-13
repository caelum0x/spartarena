import { z } from "zod";
import { TaskStatus } from "../taskStatus.js";
import { AddressSchema, Bytes32Schema } from "./agent.js";

/**
 * Task (Battle) schemas. A Task is posted by a user with an MNT reward locked in
 * the Battle Vault (TaskEscrow). These schemas validate both the user-supplied
 * creation payload and the resolved on-chain record.
 */

/** Input for posting a new Battle. */
export const TaskInputSchema = z.object({
  /** Plain-text task description (hashed on-chain as descriptionHash). */
  description: z.string().min(1).max(4000),
  /** Reward locked in escrow, in wei (native MNT). Must be positive. */
  rewardWei: z
    .string()
    .regex(/^\d+$/, "rewardWei must be a base-10 integer string")
    .refine((v) => BigInt(v) > 0n, "Reward must be greater than zero"),
  /** Unix timestamp (seconds) by which the Battle must be completed. */
  deadline: z.number().int().positive(),
  /** Optional required skill code the Spartan must possess. */
  requiredSkill: z.string().optional(),
});

/** Native enum schema for on-chain task status. */
export const TaskStatusSchema = z.nativeEnum(TaskStatus);

/**
 * Resolved on-chain Battle record (decoded from TaskEscrow.getTask).
 * bigint fields carry wei / unix-second values without precision loss.
 */
export const TaskSchema = z.object({
  taskId: z.number().int().nonnegative(),
  creator: AddressSchema,
  descriptionHash: Bytes32Schema,
  /** Reward held in the Battle Vault, in wei. */
  rewardWei: z.bigint().nonnegative(),
  /** Deadline as a unix timestamp in seconds. */
  deadline: z.bigint().nonnegative(),
  status: TaskStatusSchema,
  /** Assigned agent id, or 0 when unassigned. */
  agentId: z.number().int().nonnegative(),
  /** Hash of the submitted result, present once submitted. */
  resultHash: Bytes32Schema.optional(),
});

export type TaskInput = z.infer<typeof TaskInputSchema>;
export type Task = z.infer<typeof TaskSchema>;
