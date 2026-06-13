import { z } from "zod";

/**
 * Request validation for the tasks (Battles) module.
 *
 * Reward amounts are validated as positive base-10 wei strings to preserve
 * bigint precision across the JSON boundary.
 */

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

export const taskIdParamSchema = z.object({ id: z.string().min(1) });

export const listTasksQuerySchema = z.object({
  status: z
    .enum(["OPEN", "ACCEPTED", "SUBMITTED", "VERIFIED", "PAID", "CANCELLED"])
    .optional(),
  creator: addressSchema.optional(),
  projectId: z.string().min(1).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  creatorWallet: addressSchema,
  /** Reward locked in escrow, in wei (native MNT). */
  rewardWei: z
    .string()
    .regex(/^\d+$/, "rewardWei must be a base-10 integer string")
    .refine((v) => BigInt(v) > 0n, "Reward must be greater than zero"),
  /** Unix timestamp (seconds) by which the Battle must complete. */
  deadline: z.number().int().positive(),
  /** Optional skill code used for Project coverage and Spartan matching. */
  requiredSkill: z.string().min(1).max(64).optional(),
  /** On-chain TaskEscrow id, if already created on-chain. */
  chainTaskId: z.number().int().nonnegative().optional(),
  /** Optional sponsor Project this Battle belongs to. */
  projectId: z.string().min(1).optional(),
});

/** Verifier-supplied scores for `POST /tasks/:id/verify`. */
export const verifyTaskSchema = z.object({
  accuracy: z.number().int().min(0).max(100),
  safety: z.number().int().min(0).max(100),
  speed: z.number().int().min(0).max(100),
  userRating: z.number().int().min(0).max(100),
  /** Whether to also release escrowed payment after verifying. */
  releasePayment: z.boolean().default(false),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type VerifyTaskInput = z.infer<typeof verifyTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
