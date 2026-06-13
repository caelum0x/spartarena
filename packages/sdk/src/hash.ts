import { keccak256, toBytes, type Hex } from "viem";

/**
 * Canonical SpartArena hashing — stringify then keccak256 the UTF-8 bytes.
 *
 * This mirrors the rule documented in the plan and implemented in
 * `@spartarena/shared` and the agent-runner, so the frontend, backend, SDK and
 * agents all derive identical hashes for the same payload. It is re-exported
 * here so SDK consumers can build the `*Hash` arguments without pulling in the
 * shared package directly.
 */
export function hashJson(value: unknown): Hex {
  return keccak256(toBytes(JSON.stringify(value)));
}

export interface DecisionHashes {
  readonly promptHash: Hex;
  readonly outputHash: Hex;
  readonly toolsHash: Hex;
}

/** Derive the three decision-proof hashes recorded in the War Chronicle. */
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
