import { describe, expect, it } from "vitest";
import {
  REPUTATION_WEIGHTS,
  REPUTATION_WEIGHT_TOTAL,
  computeTotalScore,
  emptyReputation,
  honorTier,
} from "./reputation.js";

describe("REPUTATION_WEIGHTS", () => {
  it("sums to exactly 100 (mirrors the contract)", () => {
    expect(REPUTATION_WEIGHT_TOTAL).toBe(100);
  });
});

describe("computeTotalScore", () => {
  it("returns a perfect score when all components are 100", () => {
    expect(
      computeTotalScore({ accuracy: 100, safety: 100, speed: 100, userRating: 100 }),
    ).toBe(100);
  });

  it("returns 0 when all components are 0", () => {
    expect(
      computeTotalScore({ accuracy: 0, safety: 0, speed: 0, userRating: 0 }),
    ).toBe(0);
  });

  it("applies the documented weights (accuracy 40, safety 30, speed 15, user 15)", () => {
    // Only accuracy maxed -> 100*40/100 = 40
    expect(
      computeTotalScore({ accuracy: 100, safety: 0, speed: 0, userRating: 0 }),
    ).toBe(40);
    // Only safety maxed -> 30
    expect(
      computeTotalScore({ accuracy: 0, safety: 100, speed: 0, userRating: 0 }),
    ).toBe(30);
    // speed + user maxed -> 15 + 15 = 30
    expect(
      computeTotalScore({ accuracy: 0, safety: 0, speed: 100, userRating: 100 }),
    ).toBe(30);
  });

  it("clamps out-of-range components before weighting", () => {
    expect(
      computeTotalScore({ accuracy: 999, safety: -50, speed: 100, userRating: 100 }),
    ).toBe(
      // accuracy clamped to 100 (40), safety clamped to 0, speed 15, user 15
      Math.round((100 * 40 + 0 * 30 + 100 * 15 + 100 * 15) / 100),
    );
  });

  it("coerces NaN components to 0", () => {
    expect(
      computeTotalScore({ accuracy: NaN, safety: 100, speed: 0, userRating: 0 }),
    ).toBe(30);
  });
});

describe("honorTier", () => {
  it("maps score bands to tiers at the documented thresholds", () => {
    expect(honorTier(0)).toBe("Recruit");
    expect(honorTier(49)).toBe("Recruit");
    expect(honorTier(50)).toBe("Hoplite");
    expect(honorTier(74)).toBe("Hoplite");
    expect(honorTier(75)).toBe("Champion");
    expect(honorTier(89)).toBe("Champion");
    expect(honorTier(90)).toBe("Legend");
    expect(honorTier(100)).toBe("Legend");
  });

  it("clamps out-of-range scores", () => {
    expect(honorTier(-10)).toBe("Recruit");
    expect(honorTier(1000)).toBe("Legend");
  });
});

describe("emptyReputation", () => {
  it("zeroes every component for a fresh agent", () => {
    const r = emptyReputation(7);
    expect(r.agentId).toBe(7);
    expect(r.accuracy).toBe(0);
    expect(r.totalTasks).toBe(0);
    expect(r.totalEarnings).toBe(0n);
    expect(computeTotalScore(r)).toBe(0);
    expect(honorTier(computeTotalScore(r))).toBe("Recruit");
  });
});
