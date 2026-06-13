import { describe, expect, it } from "vitest";
import { analyzePoolInfo } from "./live.js";
import { hashJson } from "./skills/proof.js";
import type { SimplePoolInfo } from "./rest.js";

// Real-looking base58 Solana addresses (ChainAddressSchema validates these).
const DEEP_ADDR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const THIN_ADDR = "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP";

const DEEP_POOL: SimplePoolInfo = {
  poolAddress: DEEP_ADDR,
  mintA: "MINT_USDC",
  mintB: "MINT_USDT",
  mintASymbol: "USDC",
  mintBSymbol: "USDT",
  feeRate: "0.0001", // 1 bps
  price: "1",
  tvl: "5000000",
  volumeUsd24h: "8000000",
  feeApr24h: "0.42", // fraction -> 42%
};

const THIN_POOL: SimplePoolInfo = {
  poolAddress: THIN_ADDR,
  mintA: "MINT_X",
  mintB: "MINT_Y",
  mintASymbol: undefined,
  mintBSymbol: undefined,
  feeRate: "0.003", // 30 bps
  price: "1",
  tvl: "100000", // < 250k -> high liquidity risk
  volumeUsd24h: "5000", // very low utilization
  feeApr24h: "1.5", // already a percent (>1) -> stays 1.5
};

describe("analyzePoolInfo", () => {
  it("derives bps, APR (fraction normalized to percent) and utilization", () => {
    const r = analyzePoolInfo(DEEP_POOL, { chain: "solana" });
    expect(r.feeBps).toBe(1); // 0.0001 * 10_000
    expect(r.estimatedAprPct).toBe(42); // 0.42 <= 1 -> *100
    expect(r.utilizationPct).toBe(160); // 8M / 5M * 100
    expect(r.tvlUsd).toBe(5_000_000);
    expect(r.volume24hUsd).toBe(8_000_000);
    expect(r.pairLabel).toBe("USDC/USDT");
  });

  it("does not double-scale an APR already expressed as a percent (>1)", () => {
    const r = analyzePoolInfo(THIN_POOL);
    expect(r.estimatedAprPct).toBe(1.5);
  });

  it("scores thin liquidity as riskier than deep liquidity", () => {
    const deep = analyzePoolInfo(DEEP_POOL);
    const thin = analyzePoolInfo(THIN_POOL);
    expect(thin.riskScore).toBeGreaterThan(deep.riskScore);
    expect(deep.confidence).toBeGreaterThan(thin.confidence);
  });

  it("falls back to a derived pair label when symbols are absent", () => {
    const r = analyzePoolInfo(THIN_POOL);
    expect(r.pairLabel).toBe(`POOL-${THIN_ADDR.slice(0, 6).toUpperCase()}`);
  });

  it("prefers an explicit pairLabel override", () => {
    const r = analyzePoolInfo(THIN_POOL, { pairLabel: "X/Y" });
    expect(r.pairLabel).toBe("X/Y");
  });

  it("emits a verifiable proof hash that binds the analysis body", () => {
    const r = analyzePoolInfo(DEEP_POOL, { chain: "solana", recordedOnMantle: false });
    expect(r.proof.skill).toBe("BYREAL_POOL_ANALYSIS");
    expect(r.proof.source).toBe("live");
    expect(r.proof.recordedOnMantle).toBe(false);
    expect(r.proof.toolProofHash).toMatch(/^0x[0-9a-f]{64}$/);

    // The hash must equal keccak256 of the exact body (no proof field).
    const { proof, ...body } = r;
    expect(r.proof.toolProofHash).toBe(hashJson(body));
  });

  it("is deterministic: same input -> identical hash", () => {
    const a = analyzePoolInfo(DEEP_POOL, { chain: "solana" });
    const b = analyzePoolInfo(DEEP_POOL, { chain: "solana" });
    expect(a.proof.toolProofHash).toBe(b.proof.toolProofHash);
  });

  it("honors the recordedOnMantle flag in the proof", () => {
    const r = analyzePoolInfo(DEEP_POOL, { recordedOnMantle: true });
    expect(r.proof.recordedOnMantle).toBe(true);
  });

  it("handles zero TVL without dividing by zero", () => {
    const zero: SimplePoolInfo = { ...THIN_POOL, tvl: "0", volumeUsd24h: "0" };
    const r = analyzePoolInfo(zero);
    expect(r.utilizationPct).toBe(0);
    expect(Number.isFinite(r.estimatedAprPct)).toBe(true);
  });
});
