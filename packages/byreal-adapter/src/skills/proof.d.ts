import { type Hex } from "viem";
import type { ToolProof } from "../types.js";
/**
 * Canonical hashing for Byreal tool proofs. Mirrors the SpartArena rule used by
 * the agent-runner: stringify, then keccak256 the UTF-8 bytes, so the frontend,
 * backend and adapter all derive identical hashes for the same payload.
 */
export declare function hashJson(value: unknown): Hex;
/** Skill identifiers, paired with the user-facing label shown in the UI. */
export declare const SKILL_LABELS: {
    readonly BYREAL_POOL_ANALYSIS: "Byreal Pool Analysis";
    readonly BYREAL_TOKEN_DISCOVERY: "Byreal Token Discovery";
    readonly BYREAL_SWAP_PREVIEW: "Byreal Swap Preview";
    readonly BYREAL_POSITION_MANAGEMENT: "Byreal Position Management";
};
export type SkillId = keyof typeof SKILL_LABELS;
/**
 * Build the proof envelope for a result `body` (the result without its own
 * `proof` field). The hash binds the body so the proof is verifiable.
 */
export declare function buildProof(skill: SkillId, body: unknown, options: {
    recordedOnMantle: boolean;
    source: ToolProof["source"];
}): ToolProof;
/**
 * Deterministic 32-bit unsigned seed derived from arbitrary input. Lets the
 * mock skills produce realistic-but-stable data keyed off their inputs.
 */
export declare function seedFrom(value: unknown): number;
/** Small deterministic PRNG (mulberry32) for reproducible mock data. */
export declare function makeRng(seed: number): () => number;
/** Round to a fixed number of decimals without float-string noise. */
export declare function round(value: number, decimals?: number): number;
/** Clamp a value into the inclusive 0-100 integer score range. */
export declare function clampScore(value: number): number;
