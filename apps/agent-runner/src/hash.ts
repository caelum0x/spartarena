import { keccak256, toBytes, type Hex } from "viem";

/**
 * Canonical hashing for SpartArena decision proofs. We stringify the value and
 * keccak256 the UTF-8 bytes — the exact rule documented in the plan so that the
 * frontend, backend and agent all derive identical hashes for the same payload.
 */
export function hashJson(value: unknown): Hex {
  return keccak256(toBytes(JSON.stringify(value)));
}

export interface DecisionHashes {
  promptHash: Hex;
  outputHash: Hex;
  toolsHash: Hex;
}

export function hashDecision(prompt: unknown, output: unknown, toolCalls: unknown): DecisionHashes {
  return {
    promptHash: hashJson(prompt),
    outputHash: hashJson(output),
    toolsHash: hashJson(toolCalls),
  };
}
