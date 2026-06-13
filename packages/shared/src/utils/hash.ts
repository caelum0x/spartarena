import { keccak256, toBytes, type Hex } from "viem";

/**
 * Canonical hashing for SpartArena decision proofs.
 *
 * The rule, shared verbatim with apps/agent-runner, is:
 *   keccak256( utf8Bytes( JSON.stringify(value) ) )
 *
 * Keeping this identical across runner, api and web guarantees that all parties
 * derive the same promptHash / outputHash / toolsHash for the same payload, so
 * on-chain commitments can be independently reproduced and verified.
 */
export function hashJson(value: unknown): Hex {
  return keccak256(toBytes(JSON.stringify(value)));
}

/** keccak256 of an arbitrary UTF-8 string. */
export function hashString(value: string): Hex {
  return keccak256(toBytes(value));
}

export interface DecisionHashes {
  readonly promptHash: Hex;
  readonly outputHash: Hex;
  readonly toolsHash: Hex;
}

/**
 * Derives the three hashes committed to DecisionLedger for a single decision.
 */
export function hashDecision(
  prompt: unknown,
  output: unknown,
  toolCalls: unknown,
): DecisionHashes {
  return {
    promptHash: hashJson(prompt),
    outputHash: hashJson(output),
    toolsHash: hashJson(toolCalls),
  };
}
