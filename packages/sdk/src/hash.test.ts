import { describe, expect, it } from "vitest";
import { keccak256, toBytes } from "viem";
import { hashDecision, hashJson } from "./hash.js";
import { hashJson as sharedHashJson } from "@spartarena/shared";

describe("sdk hashJson", () => {
  it("follows the canonical rule keccak256(utf8(JSON.stringify(value)))", () => {
    const v = { agentId: 1, action: "ANALYZE" };
    expect(hashJson(v)).toBe(keccak256(toBytes(JSON.stringify(v))));
  });
});

describe("cross-package hash consistency (CRITICAL invariant)", () => {
  it("sdk and shared derive identical hashes for the same payload", () => {
    // On-chain commitments are reproduced independently by web/api/agent-runner;
    // any divergence here breaks verifiability of decision proofs.
    const payloads: unknown[] = [
      { prompt: "analyze pool", tools: ["byreal"] },
      [1, 2, 3],
      "plain string",
      { nested: { a: [true, null, 1.5] } },
    ];
    for (const p of payloads) {
      expect(hashJson(p)).toBe(sharedHashJson(p));
    }
  });
});

describe("hashDecision", () => {
  it("derives prompt/output/tools hashes independently", () => {
    const h = hashDecision("p", "o", ["t"]);
    expect(h.promptHash).toBe(hashJson("p"));
    expect(h.outputHash).toBe(hashJson("o"));
    expect(h.toolsHash).toBe(hashJson(["t"]));
  });
});
