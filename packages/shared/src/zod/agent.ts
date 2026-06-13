import { z } from "zod";
import { SKILL_CODES } from "../skillIds.js";

/**
 * Agent (Spartan) schemas. An Agent is the off-chain representation of a
 * registered Spartan Passport: the metadata stored behind `metadataURI` plus
 * the on-chain identifiers from AgentRegistry.
 */

/** A 0x-prefixed 20-byte EVM address. */
export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

/** A 0x-prefixed 32-byte hash (e.g. keccak256 output / skillsHash). */
export const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32 hash");

/** Skill codes restricted to the canonical catalogue. */
export const SkillCodeSchema = z.enum(
  SKILL_CODES as [string, ...string[]],
);

/**
 * Off-chain agent metadata (the JSON pointed to by metadataURI).
 */
export const AgentMetadataSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(2000).default(""),
  /** LLM/model identifier, e.g. "claude-opus" or "mock". */
  model: z.string().min(1),
  /** Skill codes this Spartan advertises. */
  skills: z.array(SkillCodeSchema).default([]),
  avatarUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
});

/**
 * Full agent record combining on-chain identity with off-chain metadata.
 */
export const AgentSchema = z.object({
  /** On-chain agent id from AgentRegistry. */
  agentId: z.number().int().nonnegative(),
  /** Owner EOA that registered the agent. */
  owner: AddressSchema,
  /** Wallet the agent acts from. */
  agentWallet: AddressSchema,
  /** URI of the off-chain metadata document. */
  metadataURI: z.string().min(1),
  /** keccak256 commitment over the agent's skill set. */
  skillsHash: Bytes32Schema,
  /** Parsed metadata (optional — may not be resolved yet). */
  metadata: AgentMetadataSchema.optional(),
});

export type Address = z.infer<typeof AddressSchema>;
export type Bytes32 = z.infer<typeof Bytes32Schema>;
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;
export type Agent = z.infer<typeof AgentSchema>;
