import { keccak256, toBytes, type Hex } from "viem";
import type { ToolProof } from "../types.js";

/**
 * Canonical hashing for Byreal tool proofs. Mirrors the SpartArena rule used by
 * the agent-runner: stringify, then keccak256 the UTF-8 bytes, so the frontend,
 * backend and adapter all derive identical hashes for the same payload.
 */
export function hashJson(value: unknown): Hex {
  return keccak256(toBytes(JSON.stringify(value)));
}

/** Skill identifiers, paired with the user-facing label shown in the UI. */
export const SKILL_LABELS = {
  BYREAL_POOL_ANALYSIS: "Byreal Pool Analysis",
  BYREAL_TOKEN_DISCOVERY: "Byreal Token Discovery",
  BYREAL_SWAP_PREVIEW: "Byreal Swap Preview",
  BYREAL_POSITION_MANAGEMENT: "Byreal Position Management",
} as const;

export type SkillId = keyof typeof SKILL_LABELS;

/**
 * Build the proof envelope for a result `body` (the result without its own
 * `proof` field). The hash binds the body so the proof is verifiable.
 */
export function buildProof(
  skill: SkillId,
  body: unknown,
  options: { recordedOnMantle: boolean; source: ToolProof["source"] },
): ToolProof {
  return {
    skill,
    label: SKILL_LABELS[skill],
    toolProofHash: hashJson(body),
    recordedOnMantle: options.recordedOnMantle,
    source: options.source,
  };
}

/**
 * Deterministic 32-bit unsigned seed derived from arbitrary input. Lets the
 * mock skills produce realistic-but-stable data keyed off their inputs.
 */
export function seedFrom(value: unknown): number {
  const hash = hashJson(value); // 0x + 64 hex chars
  // Take the first 8 hex chars (4 bytes) as the seed.
  return Number.parseInt(hash.slice(2, 10), 16) >>> 0;
}

/** Small deterministic PRNG (mulberry32) for reproducible mock data. */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to a fixed number of decimals without float-string noise. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Clamp a value into the inclusive 0-100 integer score range. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
