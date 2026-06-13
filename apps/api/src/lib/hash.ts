import { hashJson, hashString, hashDecision } from "@spartarena/shared";
import type { Hex } from "viem";

/**
 * Re-export the canonical SpartArena hashing helpers from `@spartarena/shared`.
 *
 * Hashing MUST be identical across runner, api and web so on-chain commitments
 * are independently reproducible: keccak256(utf8Bytes(JSON.stringify(value))).
 * Importing from one place prevents drift; this thin wrapper just gives the API
 * a stable local import path.
 */
export { hashJson, hashString, hashDecision };
export type { DecisionHashes } from "@spartarena/shared";

/**
 * Hash a plain-text Battle description into the `bytes32` committed on-chain as
 * `descriptionHash`. Uses raw UTF-8 string hashing (not JSON) to match the way
 * the frontend hashes the same description before calling `createTask`.
 */
export function hashDescription(description: string): Hex {
  return hashString(description);
}
