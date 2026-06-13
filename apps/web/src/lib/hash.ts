/**
 * Hashing helpers for the web app.
 *
 * The canonical scheme (used by agent-runner and the SDK) is keccak256 over
 * `JSON.stringify(value)` for structured outputs, and keccak256 of UTF-8 bytes
 * for plain strings. We re-export the SDK's `hashJson` and add a string hash so
 * the Create Battle form can show the descriptionHash before submitting.
 */
import { keccak256, toBytes, type Hex } from "viem";
import { hashJson } from "@spartarena/sdk";

export { hashJson };

/** keccak256 of a plain UTF-8 string — matches Solidity `keccak256(bytes(s))`. */
export function hashString(value: string): Hex {
  return keccak256(toBytes(value));
}

/** Shorten a 0x hash for compact display (0x1234…abcd). */
export function shortHash(hash: string, chars = 6): Hex | string {
  if (!hash.startsWith("0x") || hash.length <= 2 + chars * 2) return hash;
  return `${hash.slice(0, 2 + chars)}…${hash.slice(-chars)}`;
}
