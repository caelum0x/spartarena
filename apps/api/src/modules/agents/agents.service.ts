import type { Agent } from "@prisma/client";
import { skillId, SKILLS_BY_CODE } from "@spartarena/shared";
import { hashJson } from "../../lib/hash.js";
import { NotFoundError } from "../../lib/errors.js";
import { buildMeta, type PaginationArgs } from "../../lib/pagination.js";
import type { ApiMeta } from "../../lib/errors.js";
import { slugify, withSuffix } from "../../lib/slug.js";
import {
  readAgentCount,
  readBond,
  readAgentActive,
} from "../../chain/contractReads.js";
import {
  agentsRepository,
  type AgentFilter,
} from "./agents.repository.js";
import type { CreateAgentInput } from "./agents.schema.js";

/**
 * Business logic for agents (Spartans).
 *
 * The service serialises Prisma rows into a stable API DTO, resolves identifiers
 * that may be either a DB cuid or an on-chain numeric id, and derives the skills
 * hash from the canonical catalogue when registering.
 */

export interface AgentDto {
  readonly id: string;
  readonly chainAgentId: number | null;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly ownerWallet: string;
  readonly agentWallet: string;
  readonly avatarUrl: string | null;
  readonly metadataUri: string | null;
  readonly skills: string[];
  readonly skillLabels: string[];
  readonly modelProvider: string | null;
  readonly modelName: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** {@link AgentDto} enriched with on-chain war-chest staking. */
export interface AgentWithStakingDto extends AgentDto {
  /** On-chain bond in wei; "0" when chain is unavailable or agent unregistered. */
  readonly bond: string;
  /** Whether the Spartan's bond meets the active threshold on-chain. */
  readonly isActive: boolean;
}

function toDto(agent: Agent): AgentDto {
  return {
    id: agent.id,
    chainAgentId: agent.chainAgentId,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    ownerWallet: agent.ownerWallet,
    agentWallet: agent.agentWallet,
    avatarUrl: agent.avatarUrl,
    metadataUri: agent.metadataUri,
    skills: agent.skills,
    skillLabels: agent.skills.map(
      (code) => SKILLS_BY_CODE[code as keyof typeof SKILLS_BY_CODE]?.description ?? code,
    ),
    modelProvider: agent.modelProvider,
    modelName: agent.modelName,
    status: agent.status,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

/** Compute the on-chain skillsHash committed at registration from skill codes. */
export function computeSkillsHash(skills: readonly string[]): `0x${string}` {
  const ids = [...skills].sort().map((code) => skillId(code));
  return hashJson(ids);
}

export const agentsService = {
  async list(
    filter: AgentFilter,
    page: PaginationArgs,
  ): Promise<{ items: AgentDto[]; meta: ApiMeta }> {
    const { rows, total } = await agentsRepository.list(filter, page);
    return { items: rows.map(toDto), meta: buildMeta(total, page) };
  },

  /**
   * Resolve an agent by DB cuid, slug, or numeric on-chain id and enrich it with
   * its on-chain war-chest bond + active flag. Staking reads degrade to
   * "0"/false when the chain is unconfigured, the agent has no chain id, or a
   * read fails — the agent payload is always returned.
   */
  async getByIdentifier(identifier: string): Promise<AgentWithStakingDto> {
    const agent = await resolveAgent(identifier);
    if (!agent) throw new NotFoundError("Spartan");
    const staking =
      agent.chainAgentId !== null
        ? await readStaking(agent.chainAgentId).catch(() => ({
            bond: "0",
            isActive: false,
          }))
        : { bond: "0", isActive: false };
    return { ...toDto(agent), bond: staking.bond, isActive: staking.isActive };
  },

  async create(input: CreateAgentInput): Promise<AgentDto> {
    const baseSlug = slugify(input.name);
    let slug = baseSlug.length > 0 ? baseSlug : withSuffix("spartan");
    if (await agentsRepository.findBySlug(slug)) slug = withSuffix(baseSlug);

    const created = await agentsRepository.create({
      name: input.name,
      slug,
      description: input.description,
      ownerWallet: input.ownerWallet.toLowerCase(),
      agentWallet: input.agentWallet.toLowerCase(),
      skills: input.skills,
      ...(input.chainAgentId !== undefined ? { chainAgentId: input.chainAgentId } : {}),
      ...(input.modelProvider !== undefined ? { modelProvider: input.modelProvider } : {}),
      ...(input.modelName !== undefined ? { modelName: input.modelName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.metadataUri !== undefined ? { metadataUri: input.metadataUri } : {}),
    });
    return toDto(created);
  },

  /**
   * Reconcile the off-chain agent mirror with on-chain truth. For the MVP this
   * reports the on-chain agent count; full backfill is handled by the indexer.
   */
  async sync(): Promise<{ onChainAgentCount: number | null }> {
    const count = await readAgentCount();
    return { onChainAgentCount: count !== undefined ? Number(count) : null };
  },
};

/** Read on-chain bond + active flag for a chain agent id, degrading to "0"/false. */
async function readStaking(
  chainAgentId: number,
): Promise<{ bond: string; isActive: boolean }> {
  const [bond, active] = await Promise.all([
    readBond(BigInt(chainAgentId)),
    readAgentActive(BigInt(chainAgentId)),
  ]);
  return { bond: (bond ?? 0n).toString(), isActive: active ?? false };
}

/** Resolve an agent by cuid, slug or numeric on-chain id. Exported for reuse. */
export async function resolveAgent(identifier: string): Promise<Agent | null> {
  if (/^\d+$/.test(identifier)) {
    const byChain = await agentsRepository.findByChainId(Number(identifier));
    if (byChain) return byChain;
  }
  const byId = await agentsRepository.findById(identifier);
  if (byId) return byId;
  return agentsRepository.findBySlug(identifier);
}
