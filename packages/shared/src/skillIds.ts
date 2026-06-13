import { keccak256, toBytes, type Hex } from "viem";

/**
 * Canonical SpartArena skill catalogue.
 *
 * These mirror exactly the skills seeded on-chain by SkillRegistry. The on-chain
 * id is `keccak256(bytes(code))`; viem's `keccak256(toBytes(code))` produces the
 * identical 32-byte hash, so {@link SKILL_IDS} can be compared directly against
 * the values returned by `SkillRegistry.allSkillIds()` / `getSkill(bytes32)`.
 */

export interface Skill {
  /** Stable machine code, e.g. "ALPHA_DETECTION". Used to derive the on-chain id. */
  readonly code: string;
  /** Human-readable description shown in UI. */
  readonly description: string;
}

export const SKILLS = [
  {
    code: "ALPHA_DETECTION",
    description: "Detect unusual wallet/token activity on Mantle",
  },
  {
    code: "RWA_STRATEGY",
    description: "Conservative yield/RWA allocation strategy",
  },
  {
    code: "GAS_OPTIMIZATION",
    description: "Optimize wallet/contract gas usage",
  },
  {
    code: "CONTRACT_AUDIT",
    description: "Pre-deploy smart contract review",
  },
  {
    code: "BYREAL_POOL_ANALYSIS",
    description: "Analyze Byreal liquidity pools",
  },
  {
    code: "BYREAL_SWAP_PREVIEW",
    description: "Preview a Byreal swap route",
  },
  {
    code: "TELEGRAM_ALERT",
    description: "Publish alerts to Telegram/Discord",
  },
] as const satisfies readonly Skill[];

/** Union of all known skill codes. */
export type SkillCode = (typeof SKILLS)[number]["code"];

/** All skill codes as a readonly tuple. */
export const SKILL_CODES = SKILLS.map((s) => s.code) as readonly SkillCode[];

/**
 * Computes the on-chain skill id for a code: keccak256 of the UTF-8 bytes of the
 * code string. Matches Solidity's `keccak256(bytes(code))`.
 */
export function skillId(code: string): Hex {
  return keccak256(toBytes(code));
}

/** Map of skill code -> on-chain keccak256 id. */
export const SKILL_IDS: Readonly<Record<SkillCode, Hex>> = Object.freeze(
  SKILLS.reduce(
    (acc, skill) => {
      acc[skill.code] = skillId(skill.code);
      return acc;
    },
    {} as Record<SkillCode, Hex>,
  ),
);

/** Map of skill code -> full {@link Skill} record. */
export const SKILLS_BY_CODE: Readonly<Record<SkillCode, Skill>> = Object.freeze(
  SKILLS.reduce(
    (acc, skill) => {
      acc[skill.code] = skill;
      return acc;
    },
    {} as Record<SkillCode, Skill>,
  ),
);

/** Type guard for whether a string is a known skill code. */
export function isSkillCode(value: string): value is SkillCode {
  return value in SKILLS_BY_CODE;
}
