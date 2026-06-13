import { z } from "zod";
import { SKILL_CODES } from "@spartarena/shared";

/**
 * Request/response validation for the agents (Spartans) module.
 *
 * Inputs are validated at the route boundary; never trust raw query/body data.
 * Skill codes are constrained to the canonical catalogue from `@spartarena/shared`.
 */

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

export const skillCodeSchema = z.enum(SKILL_CODES as [string, ...string[]]);

/** Path param for agent routes — accepts the DB cuid or numeric chain id. */
export const agentIdParamSchema = z.object({
  id: z.string().min(1),
});

/** Filters for `GET /agents`. */
export const listAgentsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  owner: addressSchema.optional(),
  skill: skillCodeSchema.optional(),
});

/** Body for creating/syncing an off-chain agent record. */
export const createAgentSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(2000).default(""),
  ownerWallet: addressSchema,
  agentWallet: addressSchema,
  skills: z.array(skillCodeSchema).default([]),
  modelProvider: z.string().min(1).max(64).optional(),
  modelName: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().url().optional(),
  metadataUri: z.string().min(1).optional(),
  /** On-chain AgentRegistry id, if already registered. */
  chainAgentId: z.number().int().nonnegative().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
