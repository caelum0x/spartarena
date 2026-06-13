import { describe, expect, it } from "vitest";
import { keccak256, toBytes } from "viem";
import { hashDecision, hashJson, hashString } from "./hash.js";

describe("hashJson", () => {
  it("equals keccak256(utf8(JSON.stringify(value))) — the cross-package rule", () => {
    const value = { a: 1, b: ["x", "y"] };
    expect(hashJson(value)).toBe(keccak256(toBytes(JSON.stringify(value))));
  });
  it("is deterministic and 32 bytes", () => {
    expect(hashJson({ n: 1 })).toBe(hashJson({ n: 1 }));
    expect(hashJson({ n: 1 })).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("distinguishes different payloads", () => {
    expect(hashJson({ n: 1 })).not.toBe(hashJson({ n: 2 }));
  });
});

describe("hashString", () => {
  it("hashes raw utf-8 bytes", () => {
    expect(hashString("gm")).toBe(keccak256(toBytes("gm")));
  });
});

describe("hashDecision", () => {
  it("derives the three committed hashes independently", () => {
    const h = hashDecision({ prompt: "p" }, { output: "o" }, [{ tool: "t" }]);
    expect(h.promptHash).toBe(hashJson({ prompt: "p" }));
    expect(h.outputHash).toBe(hashJson({ output: "o" }));
    expect(h.toolsHash).toBe(hashJson([{ tool: "t" }]));
  });
  it("changes the relevant hash when an input changes", () => {
    const a = hashDecision("p", "o", []);
    const b = hashDecision("p2", "o", []);
    expect(a.promptHash).not.toBe(b.promptHash);
    expect(a.outputHash).toBe(b.outputHash);
    expect(a.toolsHash).toBe(b.toolsHash);
  });
});
