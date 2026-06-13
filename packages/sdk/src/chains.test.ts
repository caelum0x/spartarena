import { describe, expect, it } from "vitest";
import { getChainById, localAnvil, mantleSepolia } from "./chains.js";

describe("chain definitions", () => {
  it("uses the official Mantle Sepolia id, symbol and decimals", () => {
    expect(mantleSepolia.id).toBe(5003);
    expect(mantleSepolia.nativeCurrency.symbol).toBe("MNT");
    expect(mantleSepolia.nativeCurrency.decimals).toBe(18);
    expect(mantleSepolia.testnet).toBe(true);
  });

  it("defines the local anvil chain at 31337", () => {
    expect(localAnvil.id).toBe(31337);
  });
});

describe("getChainById", () => {
  it("resolves known chains", () => {
    expect(getChainById(5003)).toBe(mantleSepolia);
    expect(getChainById(31337)).toBe(localAnvil);
  });
  it("returns undefined for unknown chains", () => {
    expect(getChainById(1)).toBeUndefined();
    expect(getChainById(0)).toBeUndefined();
  });
});
