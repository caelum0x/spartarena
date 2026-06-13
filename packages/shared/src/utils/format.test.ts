import { describe, expect, it } from "vitest";
import { formatMnt, shortAddress, timeAgo } from "./format.js";

describe("formatMnt", () => {
  it("formats whole MNT from wei with the symbol", () => {
    expect(formatMnt(10n ** 18n)).toBe("1 MNT");
  });

  it("accepts a base-10 wei string", () => {
    expect(formatMnt("2000000000000000000")).toBe("2 MNT");
  });

  it("can omit the symbol", () => {
    expect(formatMnt(10n ** 18n, { withSymbol: false })).toBe("1");
  });

  it("caps fraction digits and trims trailing zeros", () => {
    // 1.5 MNT
    expect(formatMnt(1_500_000_000_000_000_000n)).toBe("1.5 MNT");
  });

  it("treats a non-numeric string as zero (no throw)", () => {
    expect(formatMnt("not-a-number")).toBe("0 MNT");
  });

  it("adds thousands separators for large values", () => {
    expect(formatMnt(1234n * 10n ** 18n)).toBe("1,234 MNT");
  });
});

describe("shortAddress", () => {
  it("abbreviates a full EVM address", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234…5678",
    );
  });
  it("respects a custom char count", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678", 6)).toBe(
      "0x123456…345678",
    );
  });
  it("returns short or non-0x input unchanged", () => {
    expect(shortAddress("0x1234")).toBe("0x1234");
    expect(shortAddress("not-an-address")).toBe("not-an-address");
  });
});

describe("timeAgo", () => {
  const NOW = 1_700_000_000_000; // fixed reference ms

  it("formats seconds in the past", () => {
    expect(timeAgo(NOW - 30_000, NOW)).toBe("30 seconds ago");
  });
  it("formats minutes in the future", () => {
    expect(timeAgo(NOW + 2 * 60_000, NOW)).toBe("in 2 minutes");
  });
  it("formats hours and days", () => {
    expect(timeAgo(NOW - 3 * 3_600_000, NOW)).toBe("3 hours ago");
    expect(timeAgo(NOW - 2 * 86_400_000, NOW)).toBe("2 days ago");
  });
  it("treats sub-1e12 numbers as unix seconds", () => {
    const unixSeconds = NOW / 1000 - 60; // 1 minute ago, in seconds
    expect(timeAgo(unixSeconds, NOW)).toBe("1 minute ago");
  });
  it("accepts a Date instance", () => {
    expect(timeAgo(new Date(NOW - 60_000), NOW)).toBe("1 minute ago");
  });
});
