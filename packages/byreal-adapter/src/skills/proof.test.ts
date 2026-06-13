import { describe, expect, it } from "vitest";
import { clampScore, hashJson, round, seedFrom } from "./proof.js";

describe("hashJson", () => {
  it("is deterministic for the same value", () => {
    const a = hashJson({ x: 1, y: "a" });
    const b = hashJson({ x: 1, y: "a" });
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("differs for different values", () => {
    expect(hashJson({ x: 1 })).not.toBe(hashJson({ x: 2 }));
  });

  it("is order-sensitive (JSON.stringify semantics)", () => {
    expect(hashJson({ a: 1, b: 2 })).not.toBe(hashJson({ b: 2, a: 1 }));
  });
});

describe("round", () => {
  it("rounds to 2 decimals by default", () => {
    expect(round(1.23456)).toBe(1.23);
    expect(round(1.2)).toBe(1.2);
  });

  it("respects a custom precision", () => {
    expect(round(1.23456, 4)).toBe(1.2346);
  });
});

describe("clampScore", () => {
  it("clamps into [0, 100] and rounds to an integer", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(42.6)).toBe(43);
  });
});

describe("seedFrom", () => {
  it("returns a stable unsigned 32-bit integer", () => {
    const s = seedFrom({ pool: "abc" });
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
    expect(seedFrom({ pool: "abc" })).toBe(s);
  });
});
