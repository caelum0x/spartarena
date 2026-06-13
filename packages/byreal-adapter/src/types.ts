import { z } from "zod";

/**
 * Shared, strictly-typed contract surface for the Byreal skill adapter.
 *
 * Every result carries a `proof` envelope so SpartArena can surface, in the UI
 * and (optionally) on-chain:
 *
 *   Tool used:          Byreal Pool Analysis
 *   Tool proof hash:    0x...
 *   Recorded on Mantle: yes
 *
 * The `toolProofHash` is the keccak256 of the canonical JSON of the result body
 * (excluding the proof itself), making each tool invocation independently
 * verifiable and tamper-evident.
 */

/** Ethereum-style hex string (0x-prefixed). Matches viem's `Hex`. */
export const HexSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/, "must be a 0x-prefixed hex string");
export type Hex = `0x${string}`;

/** EVM address (0x + 40 hex chars). */
export const AddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x-prefixed 20-byte address");
export type Address = z.infer<typeof AddressSchema>;

/**
 * Chain-agnostic on-chain address. Byreal is a SOLANA DEX, so real pool/token
 * addresses are base58 (e.g. `So111...112`), NOT EVM `0x` hex. EVM 0x addresses
 * are still accepted so the mock and any Mantle-side data validate too.
 */
export const ChainAddressSchema = z
  .string()
  .min(1)
  .refine(
    (v) =>
      /^0x[0-9a-fA-F]{40}$/.test(v) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),
    "must be a 0x EVM address or a base58 Solana address",
  );
export type ChainAddress = z.infer<typeof ChainAddressSchema>;

/** Bounded 0-100 score, matching SpartArena's on-chain confidence/risk range. */
const score = z.number().int().min(0).max(100);

/**
 * Settlement/data chain label. SpartArena settles proofs on Mantle, but Byreal
 * itself is a Solana DEX, so real reads/quotes are tagged `solana`.
 */
export const ByrealChainSchema = z.enum(["mantle-sepolia", "mantle", "solana"]);
export type ByrealChain = z.infer<typeof ByrealChainSchema>;

/**
 * Proof envelope attached to every adapter result. The hash binds the result
 * payload; `recordedOnMantle` flags whether the proof hash has been (or, in the
 * mock, would be) written to the DecisionLedger on Mantle.
 */
export const ToolProofSchema = z.object({
  /** Stable identifier for the Byreal skill that produced the result. */
  skill: z.enum([
    "BYREAL_POOL_ANALYSIS",
    "BYREAL_TOKEN_DISCOVERY",
    "BYREAL_SWAP_PREVIEW",
    "BYREAL_POSITION_MANAGEMENT",
  ]),
  /** Human-friendly label for UI copy ("Tool used: ..."). */
  label: z.string().min(1),
  /** keccak256 of the canonical JSON of the result body. */
  toolProofHash: HexSchema,
  /** Whether this proof hash is recorded on Mantle. */
  recordedOnMantle: z.boolean(),
  /** Source of the data — `mock` for the MVP deterministic implementation. */
  source: z.enum(["mock", "live"]),
});
export type ToolProof = z.infer<typeof ToolProofSchema>;

/* -------------------------------------------------------------------------- */
/* Pool analysis                                                              */
/* -------------------------------------------------------------------------- */

export const PoolAnalysisInputSchema = z.object({
  chain: ByrealChainSchema.default("mantle-sepolia"),
  /** Pool/pair address to analyze (EVM 0x or Solana base58). */
  poolAddress: ChainAddressSchema,
  /** Optional human label for the pool (e.g. "MNT/USDC"). */
  pairLabel: z.string().min(1).optional(),
});
export type PoolAnalysisInput = z.infer<typeof PoolAnalysisInputSchema>;

export const PoolAnalysisResultSchema = z.object({
  chain: ByrealChainSchema,
  poolAddress: ChainAddressSchema,
  pairLabel: z.string().min(1),
  /** Total value locked, in USD. */
  tvlUsd: z.number().nonnegative(),
  /** Trailing 24h trading volume, in USD. */
  volume24hUsd: z.number().nonnegative(),
  /** Pool fee in basis points (e.g. 30 = 0.30%). */
  feeBps: z.number().int().nonnegative(),
  /** Estimated annualized fee APR as a percentage. */
  estimatedAprPct: z.number().nonnegative(),
  /** Pool utilization (volume/TVL) as a percentage. */
  utilizationPct: z.number().nonnegative(),
  /** 0-100 risk score; higher means riskier. */
  riskScore: score,
  /** 0-100 confidence in this analysis. */
  confidence: score,
  /** Concise, user-friendly takeaways. */
  signals: z.array(z.string().min(1)),
  humanSummary: z.string().min(1),
  proof: ToolProofSchema,
});
export type PoolAnalysisResult = z.infer<typeof PoolAnalysisResultSchema>;

/* -------------------------------------------------------------------------- */
/* Token discovery                                                            */
/* -------------------------------------------------------------------------- */

export const TokenDiscoveryInputSchema = z.object({
  chain: ByrealChainSchema.default("mantle-sepolia"),
  /** Free-text query, e.g. "trending Mantle LSTs" or a symbol. */
  query: z.string().min(1),
  /** Max number of candidates to return. */
  limit: z.number().int().min(1).max(50).default(5),
});
export type TokenDiscoveryInput = z.infer<typeof TokenDiscoveryInputSchema>;

export const DiscoveredTokenSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  address: ChainAddressSchema,
  /** Fully-diluted-ish market cap, in USD. */
  marketCapUsd: z.number().nonnegative(),
  /** Trailing 24h volume, in USD. */
  volume24hUsd: z.number().nonnegative(),
  /** 24h price change as a percentage (may be negative). */
  priceChange24hPct: z.number(),
  /** 0-100 liquidity health score; higher is healthier. */
  liquidityScore: score,
  /** 0-100 risk score; higher means riskier. */
  riskScore: score,
  reason: z.string().min(1),
});
export type DiscoveredToken = z.infer<typeof DiscoveredTokenSchema>;

export const TokenDiscoveryResultSchema = z.object({
  chain: ByrealChainSchema,
  query: z.string().min(1),
  tokens: z.array(DiscoveredTokenSchema),
  /** 0-100 confidence in the overall discovery set. */
  confidence: score,
  humanSummary: z.string().min(1),
  proof: ToolProofSchema,
});
export type TokenDiscoveryResult = z.infer<typeof TokenDiscoveryResultSchema>;

/* -------------------------------------------------------------------------- */
/* Swap preview                                                               */
/* -------------------------------------------------------------------------- */

export const SwapPreviewInputSchema = z.object({
  chain: ByrealChainSchema.default("mantle-sepolia"),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  /** Human-readable input amount (decimal string to avoid float drift). */
  amountIn: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "amountIn must be a positive decimal string"),
  /** Allowed slippage, in basis points (e.g. 50 = 0.50%). */
  slippageBps: z.number().int().min(0).max(10_000).default(50),
});
export type SwapPreviewInput = z.infer<typeof SwapPreviewInputSchema>;

export const SwapPreviewResultSchema = z.object({
  chain: ByrealChainSchema,
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.string().min(1),
  /** Expected output amount as a decimal string. */
  expectedAmountOut: z.string().min(1),
  /** Worst-case output after slippage, as a decimal string. */
  minAmountOut: z.string().min(1),
  /** Effective execution price (out per in). */
  executionPrice: z.number().nonnegative(),
  /** Price impact of the trade, as a percentage. */
  priceImpactPct: z.number().nonnegative(),
  /** Estimated network fee, in MNT (decimal string). */
  estimatedGasMnt: z.string().min(1),
  /** Multi-hop route as a list of token symbols. */
  route: z.array(z.string().min(1)).min(2),
  slippageBps: z.number().int().min(0).max(10_000),
  /** 0-100 risk score for executing this swap. */
  riskScore: score,
  humanSummary: z.string().min(1),
  proof: ToolProofSchema,
});
export type SwapPreviewResult = z.infer<typeof SwapPreviewResultSchema>;

/* -------------------------------------------------------------------------- */
/* Position management                                                        */
/* -------------------------------------------------------------------------- */

export const PositionActionSchema = z.enum([
  "open",
  "increase",
  "decrease",
  "close",
  "rebalance",
]);
export type PositionAction = z.infer<typeof PositionActionSchema>;

export const PositionInputSchema = z.object({
  chain: ByrealChainSchema.default("mantle-sepolia"),
  /** Existing position id; omit when opening a new position. */
  positionId: z.string().min(1).optional(),
  poolAddress: ChainAddressSchema,
  action: PositionActionSchema,
  /** Liquidity amount to apply (decimal string). Optional for `close`. */
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "amount must be a positive decimal string")
    .optional(),
});
export type PositionInput = z.infer<typeof PositionInputSchema>;

export const PositionResultSchema = z.object({
  chain: ByrealChainSchema,
  positionId: z.string().min(1),
  poolAddress: ChainAddressSchema,
  action: PositionActionSchema,
  /** Position status after the (simulated) action. */
  status: z.enum(["open", "closed", "rebalanced"]),
  /** Current liquidity, as a decimal string. */
  liquidity: z.string().min(1),
  /** Position value, in USD. */
  valueUsd: z.number().nonnegative(),
  /** Unclaimed fees earned, in USD. */
  feesEarnedUsd: z.number().nonnegative(),
  /** 0-100 risk score for the resulting position. */
  riskScore: score,
  /** Recommended next steps / guardrails for the operator. */
  recommendations: z.array(z.string().min(1)),
  humanSummary: z.string().min(1),
  proof: ToolProofSchema,
});
export type PositionResult = z.infer<typeof PositionResultSchema>;
