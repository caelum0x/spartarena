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
export declare const HexSchema: z.ZodString;
export type Hex = `0x${string}`;
/** EVM address (0x + 40 hex chars). */
export declare const AddressSchema: z.ZodString;
export type Address = z.infer<typeof AddressSchema>;
/**
 * Chain-agnostic on-chain address. Byreal is a SOLANA DEX, so real pool/token
 * addresses are base58 (e.g. `So111...112`), NOT EVM `0x` hex. EVM 0x addresses
 * are still accepted so the mock and any Mantle-side data validate too.
 */
export declare const ChainAddressSchema: z.ZodEffects<z.ZodString, string, string>;
export type ChainAddress = z.infer<typeof ChainAddressSchema>;
/**
 * Settlement/data chain label. SpartArena settles proofs on Mantle, but Byreal
 * itself is a Solana DEX, so real reads/quotes are tagged `solana`.
 */
export declare const ByrealChainSchema: z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>;
export type ByrealChain = z.infer<typeof ByrealChainSchema>;
/**
 * Proof envelope attached to every adapter result. The hash binds the result
 * payload; `recordedOnMantle` flags whether the proof hash has been (or, in the
 * mock, would be) written to the DecisionLedger on Mantle.
 */
export declare const ToolProofSchema: z.ZodObject<{
    /** Stable identifier for the Byreal skill that produced the result. */
    skill: z.ZodEnum<["BYREAL_POOL_ANALYSIS", "BYREAL_TOKEN_DISCOVERY", "BYREAL_SWAP_PREVIEW", "BYREAL_POSITION_MANAGEMENT"]>;
    /** Human-friendly label for UI copy ("Tool used: ..."). */
    label: z.ZodString;
    /** keccak256 of the canonical JSON of the result body. */
    toolProofHash: z.ZodString;
    /** Whether this proof hash is recorded on Mantle. */
    recordedOnMantle: z.ZodBoolean;
    /** Source of the data — `mock` for the MVP deterministic implementation. */
    source: z.ZodEnum<["mock", "live"]>;
}, "strip", z.ZodTypeAny, {
    skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
    label: string;
    toolProofHash: string;
    recordedOnMantle: boolean;
    source: "mock" | "live";
}, {
    skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
    label: string;
    toolProofHash: string;
    recordedOnMantle: boolean;
    source: "mock" | "live";
}>;
export type ToolProof = z.infer<typeof ToolProofSchema>;
export declare const PoolAnalysisInputSchema: z.ZodObject<{
    chain: z.ZodDefault<z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>>;
    /** Pool/pair address to analyze (EVM 0x or Solana base58). */
    poolAddress: z.ZodEffects<z.ZodString, string, string>;
    /** Optional human label for the pool (e.g. "MNT/USDC"). */
    pairLabel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    pairLabel?: string | undefined;
}, {
    poolAddress: string;
    chain?: "mantle-sepolia" | "mantle" | "solana" | undefined;
    pairLabel?: string | undefined;
}>;
export type PoolAnalysisInput = z.infer<typeof PoolAnalysisInputSchema>;
export declare const PoolAnalysisResultSchema: z.ZodObject<{
    chain: z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>;
    poolAddress: z.ZodEffects<z.ZodString, string, string>;
    pairLabel: z.ZodString;
    /** Total value locked, in USD. */
    tvlUsd: z.ZodNumber;
    /** Trailing 24h trading volume, in USD. */
    volume24hUsd: z.ZodNumber;
    /** Pool fee in basis points (e.g. 30 = 0.30%). */
    feeBps: z.ZodNumber;
    /** Estimated annualized fee APR as a percentage. */
    estimatedAprPct: z.ZodNumber;
    /** Pool utilization (volume/TVL) as a percentage. */
    utilizationPct: z.ZodNumber;
    /** 0-100 risk score; higher means riskier. */
    riskScore: z.ZodNumber;
    /** 0-100 confidence in this analysis. */
    confidence: z.ZodNumber;
    /** Concise, user-friendly takeaways. */
    signals: z.ZodArray<z.ZodString, "many">;
    humanSummary: z.ZodString;
    proof: z.ZodObject<{
        /** Stable identifier for the Byreal skill that produced the result. */
        skill: z.ZodEnum<["BYREAL_POOL_ANALYSIS", "BYREAL_TOKEN_DISCOVERY", "BYREAL_SWAP_PREVIEW", "BYREAL_POSITION_MANAGEMENT"]>;
        /** Human-friendly label for UI copy ("Tool used: ..."). */
        label: z.ZodString;
        /** keccak256 of the canonical JSON of the result body. */
        toolProofHash: z.ZodString;
        /** Whether this proof hash is recorded on Mantle. */
        recordedOnMantle: z.ZodBoolean;
        /** Source of the data — `mock` for the MVP deterministic implementation. */
        source: z.ZodEnum<["mock", "live"]>;
    }, "strip", z.ZodTypeAny, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    pairLabel: string;
    tvlUsd: number;
    volume24hUsd: number;
    feeBps: number;
    estimatedAprPct: number;
    utilizationPct: number;
    riskScore: number;
    confidence: number;
    signals: string[];
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
}, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    pairLabel: string;
    tvlUsd: number;
    volume24hUsd: number;
    feeBps: number;
    estimatedAprPct: number;
    utilizationPct: number;
    riskScore: number;
    confidence: number;
    signals: string[];
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
}>;
export type PoolAnalysisResult = z.infer<typeof PoolAnalysisResultSchema>;
export declare const TokenDiscoveryInputSchema: z.ZodObject<{
    chain: z.ZodDefault<z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>>;
    /** Free-text query, e.g. "trending Mantle LSTs" or a symbol. */
    query: z.ZodString;
    /** Max number of candidates to return. */
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    query: string;
    limit: number;
}, {
    query: string;
    chain?: "mantle-sepolia" | "mantle" | "solana" | undefined;
    limit?: number | undefined;
}>;
export type TokenDiscoveryInput = z.infer<typeof TokenDiscoveryInputSchema>;
export declare const DiscoveredTokenSchema: z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodString;
    address: z.ZodEffects<z.ZodString, string, string>;
    /** Fully-diluted-ish market cap, in USD. */
    marketCapUsd: z.ZodNumber;
    /** Trailing 24h volume, in USD. */
    volume24hUsd: z.ZodNumber;
    /** 24h price change as a percentage (may be negative). */
    priceChange24hPct: z.ZodNumber;
    /** 0-100 liquidity health score; higher is healthier. */
    liquidityScore: z.ZodNumber;
    /** 0-100 risk score; higher means riskier. */
    riskScore: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    volume24hUsd: number;
    riskScore: number;
    name: string;
    address: string;
    marketCapUsd: number;
    priceChange24hPct: number;
    liquidityScore: number;
    reason: string;
}, {
    symbol: string;
    volume24hUsd: number;
    riskScore: number;
    name: string;
    address: string;
    marketCapUsd: number;
    priceChange24hPct: number;
    liquidityScore: number;
    reason: string;
}>;
export type DiscoveredToken = z.infer<typeof DiscoveredTokenSchema>;
export declare const TokenDiscoveryResultSchema: z.ZodObject<{
    chain: z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>;
    query: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        name: z.ZodString;
        address: z.ZodEffects<z.ZodString, string, string>;
        /** Fully-diluted-ish market cap, in USD. */
        marketCapUsd: z.ZodNumber;
        /** Trailing 24h volume, in USD. */
        volume24hUsd: z.ZodNumber;
        /** 24h price change as a percentage (may be negative). */
        priceChange24hPct: z.ZodNumber;
        /** 0-100 liquidity health score; higher is healthier. */
        liquidityScore: z.ZodNumber;
        /** 0-100 risk score; higher means riskier. */
        riskScore: z.ZodNumber;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        volume24hUsd: number;
        riskScore: number;
        name: string;
        address: string;
        marketCapUsd: number;
        priceChange24hPct: number;
        liquidityScore: number;
        reason: string;
    }, {
        symbol: string;
        volume24hUsd: number;
        riskScore: number;
        name: string;
        address: string;
        marketCapUsd: number;
        priceChange24hPct: number;
        liquidityScore: number;
        reason: string;
    }>, "many">;
    /** 0-100 confidence in the overall discovery set. */
    confidence: z.ZodNumber;
    humanSummary: z.ZodString;
    proof: z.ZodObject<{
        /** Stable identifier for the Byreal skill that produced the result. */
        skill: z.ZodEnum<["BYREAL_POOL_ANALYSIS", "BYREAL_TOKEN_DISCOVERY", "BYREAL_SWAP_PREVIEW", "BYREAL_POSITION_MANAGEMENT"]>;
        /** Human-friendly label for UI copy ("Tool used: ..."). */
        label: z.ZodString;
        /** keccak256 of the canonical JSON of the result body. */
        toolProofHash: z.ZodString;
        /** Whether this proof hash is recorded on Mantle. */
        recordedOnMantle: z.ZodBoolean;
        /** Source of the data — `mock` for the MVP deterministic implementation. */
        source: z.ZodEnum<["mock", "live"]>;
    }, "strip", z.ZodTypeAny, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    confidence: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    query: string;
    tokens: {
        symbol: string;
        volume24hUsd: number;
        riskScore: number;
        name: string;
        address: string;
        marketCapUsd: number;
        priceChange24hPct: number;
        liquidityScore: number;
        reason: string;
    }[];
}, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    confidence: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    query: string;
    tokens: {
        symbol: string;
        volume24hUsd: number;
        riskScore: number;
        name: string;
        address: string;
        marketCapUsd: number;
        priceChange24hPct: number;
        liquidityScore: number;
        reason: string;
    }[];
}>;
export type TokenDiscoveryResult = z.infer<typeof TokenDiscoveryResultSchema>;
export declare const SwapPreviewInputSchema: z.ZodObject<{
    chain: z.ZodDefault<z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>>;
    tokenIn: z.ZodString;
    tokenOut: z.ZodString;
    /** Human-readable input amount (decimal string to avoid float drift). */
    amountIn: z.ZodString;
    /** Allowed slippage, in basis points (e.g. 50 = 0.50%). */
    slippageBps: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps: number;
}, {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chain?: "mantle-sepolia" | "mantle" | "solana" | undefined;
    slippageBps?: number | undefined;
}>;
export type SwapPreviewInput = z.infer<typeof SwapPreviewInputSchema>;
export declare const SwapPreviewResultSchema: z.ZodObject<{
    chain: z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>;
    tokenIn: z.ZodString;
    tokenOut: z.ZodString;
    amountIn: z.ZodString;
    /** Expected output amount as a decimal string. */
    expectedAmountOut: z.ZodString;
    /** Worst-case output after slippage, as a decimal string. */
    minAmountOut: z.ZodString;
    /** Effective execution price (out per in). */
    executionPrice: z.ZodNumber;
    /** Price impact of the trade, as a percentage. */
    priceImpactPct: z.ZodNumber;
    /** Estimated network fee, in MNT (decimal string). */
    estimatedGasMnt: z.ZodString;
    /** Multi-hop route as a list of token symbols. */
    route: z.ZodArray<z.ZodString, "many">;
    slippageBps: z.ZodNumber;
    /** 0-100 risk score for executing this swap. */
    riskScore: z.ZodNumber;
    humanSummary: z.ZodString;
    proof: z.ZodObject<{
        /** Stable identifier for the Byreal skill that produced the result. */
        skill: z.ZodEnum<["BYREAL_POOL_ANALYSIS", "BYREAL_TOKEN_DISCOVERY", "BYREAL_SWAP_PREVIEW", "BYREAL_POSITION_MANAGEMENT"]>;
        /** Human-friendly label for UI copy ("Tool used: ..."). */
        label: z.ZodString;
        /** keccak256 of the canonical JSON of the result body. */
        toolProofHash: z.ZodString;
        /** Whether this proof hash is recorded on Mantle. */
        recordedOnMantle: z.ZodBoolean;
        /** Source of the data — `mock` for the MVP deterministic implementation. */
        source: z.ZodEnum<["mock", "live"]>;
    }, "strip", z.ZodTypeAny, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    riskScore: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps: number;
    expectedAmountOut: string;
    minAmountOut: string;
    executionPrice: number;
    priceImpactPct: number;
    estimatedGasMnt: string;
    route: string[];
}, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    riskScore: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps: number;
    expectedAmountOut: string;
    minAmountOut: string;
    executionPrice: number;
    priceImpactPct: number;
    estimatedGasMnt: string;
    route: string[];
}>;
export type SwapPreviewResult = z.infer<typeof SwapPreviewResultSchema>;
export declare const PositionActionSchema: z.ZodEnum<["open", "increase", "decrease", "close", "rebalance"]>;
export type PositionAction = z.infer<typeof PositionActionSchema>;
export declare const PositionInputSchema: z.ZodObject<{
    chain: z.ZodDefault<z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>>;
    /** Existing position id; omit when opening a new position. */
    positionId: z.ZodOptional<z.ZodString>;
    poolAddress: z.ZodEffects<z.ZodString, string, string>;
    action: z.ZodEnum<["open", "increase", "decrease", "close", "rebalance"]>;
    /** Liquidity amount to apply (decimal string). Optional for `close`. */
    amount: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    action: "open" | "increase" | "decrease" | "close" | "rebalance";
    positionId?: string | undefined;
    amount?: string | undefined;
}, {
    poolAddress: string;
    action: "open" | "increase" | "decrease" | "close" | "rebalance";
    chain?: "mantle-sepolia" | "mantle" | "solana" | undefined;
    positionId?: string | undefined;
    amount?: string | undefined;
}>;
export type PositionInput = z.infer<typeof PositionInputSchema>;
export declare const PositionResultSchema: z.ZodObject<{
    chain: z.ZodEnum<["mantle-sepolia", "mantle", "solana"]>;
    positionId: z.ZodString;
    poolAddress: z.ZodEffects<z.ZodString, string, string>;
    action: z.ZodEnum<["open", "increase", "decrease", "close", "rebalance"]>;
    /** Position status after the (simulated) action. */
    status: z.ZodEnum<["open", "closed", "rebalanced"]>;
    /** Current liquidity, as a decimal string. */
    liquidity: z.ZodString;
    /** Position value, in USD. */
    valueUsd: z.ZodNumber;
    /** Unclaimed fees earned, in USD. */
    feesEarnedUsd: z.ZodNumber;
    /** 0-100 risk score for the resulting position. */
    riskScore: z.ZodNumber;
    /** Recommended next steps / guardrails for the operator. */
    recommendations: z.ZodArray<z.ZodString, "many">;
    humanSummary: z.ZodString;
    proof: z.ZodObject<{
        /** Stable identifier for the Byreal skill that produced the result. */
        skill: z.ZodEnum<["BYREAL_POOL_ANALYSIS", "BYREAL_TOKEN_DISCOVERY", "BYREAL_SWAP_PREVIEW", "BYREAL_POSITION_MANAGEMENT"]>;
        /** Human-friendly label for UI copy ("Tool used: ..."). */
        label: z.ZodString;
        /** keccak256 of the canonical JSON of the result body. */
        toolProofHash: z.ZodString;
        /** Whether this proof hash is recorded on Mantle. */
        recordedOnMantle: z.ZodBoolean;
        /** Source of the data — `mock` for the MVP deterministic implementation. */
        source: z.ZodEnum<["mock", "live"]>;
    }, "strip", z.ZodTypeAny, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }, {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    }>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "closed" | "rebalanced";
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    riskScore: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    positionId: string;
    action: "open" | "increase" | "decrease" | "close" | "rebalance";
    liquidity: string;
    valueUsd: number;
    feesEarnedUsd: number;
    recommendations: string[];
}, {
    status: "open" | "closed" | "rebalanced";
    chain: "mantle-sepolia" | "mantle" | "solana";
    poolAddress: string;
    riskScore: number;
    humanSummary: string;
    proof: {
        skill: "BYREAL_POOL_ANALYSIS" | "BYREAL_TOKEN_DISCOVERY" | "BYREAL_SWAP_PREVIEW" | "BYREAL_POSITION_MANAGEMENT";
        label: string;
        toolProofHash: string;
        recordedOnMantle: boolean;
        source: "mock" | "live";
    };
    positionId: string;
    action: "open" | "increase" | "decrease" | "close" | "rebalance";
    liquidity: string;
    valueUsd: number;
    feesEarnedUsd: number;
    recommendations: string[];
}>;
export type PositionResult = z.infer<typeof PositionResultSchema>;
