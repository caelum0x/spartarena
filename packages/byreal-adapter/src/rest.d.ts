import { z } from "zod";
/**
 * Real Byreal REST client.
 *
 * Byreal is a SOLANA DEX. This client is READ/QUOTE-ONLY: it lists pools and
 * tokens, fetches pool details and mint prices, and previews swap quotes WITHOUT
 * a wallet (no `userPublicKey` => the router returns a non-executable preview).
 * Live LP execution / signing is Solana-side and out of scope here.
 *
 * Money fields in Byreal responses are STRINGS (to preserve precision). We keep
 * them as strings in the parsed shape and parse to numbers only at the adapter
 * boundary, carefully.
 *
 * All responses are validated with zod. Requests use native fetch with an
 * AbortController timeout and bounded retries with exponential backoff.
 */
/** Default Byreal API base URL (no auth required for reads/quotes). */
export declare const DEFAULT_BYREAL_API_URL = "https://api2.byreal.io";
export declare const SimplePoolInfoSchema: z.ZodEffects<z.ZodObject<{
    poolAddress: z.ZodString;
    mintA: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        address: z.ZodOptional<z.ZodString>;
        symbol: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        mintInfo: z.ZodOptional<z.ZodObject<{
            address: z.ZodOptional<z.ZodString>;
            symbol: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            decimals: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        }, {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }>, {
        address: string | undefined;
        symbol: string | undefined;
        name: string | undefined;
        decimals: number | undefined;
    }, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }>>;
    mintB: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        address: z.ZodOptional<z.ZodString>;
        symbol: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        mintInfo: z.ZodOptional<z.ZodObject<{
            address: z.ZodOptional<z.ZodString>;
            symbol: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            decimals: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        }, {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }>, {
        address: string | undefined;
        symbol: string | undefined;
        name: string | undefined;
        decimals: number | undefined;
    }, {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    }>>;
    mintAddressA: z.ZodOptional<z.ZodString>;
    mintAddressB: z.ZodOptional<z.ZodString>;
    feeRate: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodObject<{
        fixFeeRate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    }, "strip", z.ZodTypeAny, {
        fixFeeRate?: string | number | undefined;
    }, {
        fixFeeRate?: string | number | undefined;
    }>, string | undefined, {
        fixFeeRate?: string | number | undefined;
    }>, z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>]>>;
    price: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    tvl: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    volumeUsd24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    volume24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    feeApr24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    apr24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
}, "strip", z.ZodTypeAny, {
    poolAddress: string;
    mintA?: {
        address: string | undefined;
        symbol: string | undefined;
        name: string | undefined;
        decimals: number | undefined;
    } | undefined;
    mintB?: {
        address: string | undefined;
        symbol: string | undefined;
        name: string | undefined;
        decimals: number | undefined;
    } | undefined;
    mintAddressA?: string | undefined;
    mintAddressB?: string | undefined;
    feeRate?: string | undefined;
    price?: string | undefined;
    tvl?: string | undefined;
    volumeUsd24h?: string | undefined;
    volume24h?: string | undefined;
    feeApr24h?: string | undefined;
    apr24h?: string | undefined;
}, {
    poolAddress: string;
    mintA?: {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    } | undefined;
    mintB?: {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    } | undefined;
    mintAddressA?: string | undefined;
    mintAddressB?: string | undefined;
    feeRate?: string | number | {
        fixFeeRate?: string | number | undefined;
    } | undefined;
    price?: string | number | undefined;
    tvl?: string | number | undefined;
    volumeUsd24h?: string | number | undefined;
    volume24h?: string | number | undefined;
    feeApr24h?: string | number | undefined;
    apr24h?: string | number | undefined;
}>, {
    poolAddress: string;
    mintA: string | undefined;
    mintB: string | undefined;
    mintASymbol: string | undefined;
    mintBSymbol: string | undefined;
    feeRate: string | undefined;
    price: string | undefined;
    tvl: string | undefined;
    volumeUsd24h: string | undefined;
    feeApr24h: string | undefined;
}, {
    poolAddress: string;
    mintA?: {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    } | undefined;
    mintB?: {
        symbol?: string | undefined;
        name?: string | undefined;
        address?: string | undefined;
        decimals?: number | undefined;
        mintInfo?: {
            symbol?: string | undefined;
            name?: string | undefined;
            address?: string | undefined;
            decimals?: number | undefined;
        } | undefined;
    } | undefined;
    mintAddressA?: string | undefined;
    mintAddressB?: string | undefined;
    feeRate?: string | number | {
        fixFeeRate?: string | number | undefined;
    } | undefined;
    price?: string | number | undefined;
    tvl?: string | number | undefined;
    volumeUsd24h?: string | number | undefined;
    volume24h?: string | number | undefined;
    feeApr24h?: string | number | undefined;
    apr24h?: string | number | undefined;
}>;
export type SimplePoolInfo = z.infer<typeof SimplePoolInfoSchema>;
/** Token/mint metadata from the mint list / hot endpoints. */
export declare const MintInfoSchema: z.ZodEffects<z.ZodObject<{
    address: z.ZodString;
    symbol: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    name: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    decimals: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    logoURI: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    volumeUsd24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    marketCap: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    priceChange24h: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    price?: string | undefined;
    volumeUsd24h?: string | undefined;
    logoURI?: string | undefined;
    marketCap?: string | undefined;
    priceChange24h?: string | undefined;
}, {
    address: string;
    symbol?: string | undefined;
    name?: string | undefined;
    decimals?: number | undefined;
    price?: string | number | undefined;
    volumeUsd24h?: string | number | undefined;
    logoURI?: string | undefined;
    marketCap?: string | number | undefined;
    priceChange24h?: string | number | undefined;
}>, {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI: string | undefined;
    price: string | undefined;
    volumeUsd24h: string | undefined;
    marketCap: string | undefined;
    priceChange24h: string | undefined;
}, {
    address: string;
    symbol?: string | undefined;
    name?: string | undefined;
    decimals?: number | undefined;
    price?: string | number | undefined;
    volumeUsd24h?: string | number | undefined;
    logoURI?: string | undefined;
    marketCap?: string | number | undefined;
    priceChange24h?: string | number | undefined;
}>;
export type MintInfo = z.infer<typeof MintInfoSchema>;
/** Mint price map: `{ [mintAddress]: priceString }`. */
export declare const MintPriceSchema: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
export type MintPriceMap = z.infer<typeof MintPriceSchema>;
/** Router swap quote (preview — no wallet attached). */
export declare const SwapQuoteSchema: z.ZodEffects<z.ZodObject<{
    result: z.ZodOptional<z.ZodObject<{
        retCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        retMsg: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        retCode?: string | number | undefined;
        retMsg?: string | undefined;
    }, {
        retCode?: string | number | undefined;
        retMsg?: string | undefined;
    }>>;
    inputMint: z.ZodOptional<z.ZodString>;
    outputMint: z.ZodOptional<z.ZodString>;
    inAmount: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    outAmount: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    otherAmountThreshold: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    priceImpactPct: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    swapMode: z.ZodOptional<z.ZodString>;
    slippageBps: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    poolAddresses: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    routerType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    poolAddresses: string[];
    slippageBps?: string | number | undefined;
    priceImpactPct?: string | undefined;
    result?: {
        retCode?: string | number | undefined;
        retMsg?: string | undefined;
    } | undefined;
    inputMint?: string | undefined;
    outputMint?: string | undefined;
    inAmount?: string | undefined;
    outAmount?: string | undefined;
    otherAmountThreshold?: string | undefined;
    swapMode?: string | undefined;
    routerType?: string | undefined;
}, {
    slippageBps?: string | number | undefined;
    priceImpactPct?: string | number | undefined;
    result?: {
        retCode?: string | number | undefined;
        retMsg?: string | undefined;
    } | undefined;
    inputMint?: string | undefined;
    outputMint?: string | undefined;
    inAmount?: string | number | undefined;
    outAmount?: string | number | undefined;
    otherAmountThreshold?: string | number | undefined;
    swapMode?: string | undefined;
    poolAddresses?: string[] | undefined;
    routerType?: string | undefined;
}>, {
    retCode: string | number | undefined;
    retMsg: string | undefined;
    inputMint: string | undefined;
    outputMint: string | undefined;
    inAmount: string | undefined;
    outAmount: string | undefined;
    otherAmountThreshold: string | undefined;
    priceImpactPct: string | undefined;
    swapMode: string | undefined;
    slippageBps: string | undefined;
    poolAddresses: string[];
    routerType: string | undefined;
}, {
    slippageBps?: string | number | undefined;
    priceImpactPct?: string | number | undefined;
    result?: {
        retCode?: string | number | undefined;
        retMsg?: string | undefined;
    } | undefined;
    inputMint?: string | undefined;
    outputMint?: string | undefined;
    inAmount?: string | number | undefined;
    outAmount?: string | number | undefined;
    otherAmountThreshold?: string | number | undefined;
    swapMode?: string | undefined;
    poolAddresses?: string[] | undefined;
    routerType?: string | undefined;
}>;
export type SwapQuote = z.infer<typeof SwapQuoteSchema>;
/** An LP position row (read-only). Mutations are Solana-side, out of scope. */
export declare const PositionInfoSchema: z.ZodEffects<z.ZodObject<{
    positionId: z.ZodOptional<z.ZodString>;
    nftMint: z.ZodOptional<z.ZodString>;
    poolAddress: z.ZodOptional<z.ZodString>;
    liquidity: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    tickLower: z.ZodOptional<z.ZodNumber>;
    tickUpper: z.ZodOptional<z.ZodNumber>;
    amountA: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    amountB: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    valueUsd: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
    feesUsd: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string, string | number>>;
}, "strip", z.ZodTypeAny, {
    poolAddress?: string | undefined;
    positionId?: string | undefined;
    liquidity?: string | undefined;
    valueUsd?: string | undefined;
    nftMint?: string | undefined;
    tickLower?: number | undefined;
    tickUpper?: number | undefined;
    amountA?: string | undefined;
    amountB?: string | undefined;
    feesUsd?: string | undefined;
}, {
    poolAddress?: string | undefined;
    positionId?: string | undefined;
    liquidity?: string | number | undefined;
    valueUsd?: string | number | undefined;
    nftMint?: string | undefined;
    tickLower?: number | undefined;
    tickUpper?: number | undefined;
    amountA?: string | number | undefined;
    amountB?: string | number | undefined;
    feesUsd?: string | number | undefined;
}>, {
    positionId: string | undefined;
    poolAddress: string | undefined;
    liquidity: string | undefined;
    tickLower: number | undefined;
    tickUpper: number | undefined;
    amountA: string | undefined;
    amountB: string | undefined;
    valueUsd: string | undefined;
    feesUsd: string | undefined;
}, {
    poolAddress?: string | undefined;
    positionId?: string | undefined;
    liquidity?: string | number | undefined;
    valueUsd?: string | number | undefined;
    nftMint?: string | undefined;
    tickLower?: number | undefined;
    tickUpper?: number | undefined;
    amountA?: string | number | undefined;
    amountB?: string | number | undefined;
    feesUsd?: string | number | undefined;
}>;
export type PositionInfo = z.infer<typeof PositionInfoSchema>;
export interface ByrealRestClientOptions {
    /** Base URL; defaults to env `BYREAL_API_URL` or {@link DEFAULT_BYREAL_API_URL}. */
    baseUrl?: string;
    /** Per-request timeout in ms (default 15000). */
    timeoutMs?: number;
    /** Max retry attempts on transient failures (default 2 retries => 3 tries). */
    maxRetries?: number;
    /** Injectable fetch for testing; defaults to global `fetch`. */
    fetchImpl?: typeof fetch;
}
export interface PoolsListParams {
    sortField?: string;
    sortType?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}
export interface MintListParams {
    searchKey?: string;
    sortField?: string;
    sortType?: "asc" | "desc";
    page?: number;
    pageSize?: number;
}
export interface SwapQuoteParams {
    inputMint: string;
    outputMint: string;
    /** Raw integer amount string in the input mint's base units. */
    amount: string;
    swapMode?: "in" | "out";
    slippageBps?: string;
}
/** Thrown for any non-recoverable Byreal request failure. */
export declare class ByrealRequestError extends Error {
    readonly status?: number;
    constructor(message: string, status?: number);
}
export declare class ByrealRestClient {
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly fetchImpl;
    constructor(options?: ByrealRestClientOptions);
    /** GET pools list, validate + normalize to {@link SimplePoolInfo}[]. */
    listPools(params?: PoolsListParams): Promise<SimplePoolInfo[]>;
    /** GET a single pool's details by address. */
    getPoolDetails(poolAddress: string): Promise<SimplePoolInfo | null>;
    /** GET token/mint list (discovery), validate + normalize to {@link MintInfo}[]. */
    listMints(params?: MintListParams): Promise<MintInfo[]>;
    /** GET mint prices for one or more mint addresses. */
    getMintPrices(mints: string[]): Promise<MintPriceMap>;
    /**
     * POST a swap quote PREVIEW. We intentionally omit `userPublicKey`, so the
     * router returns a non-executable preview (no transaction to sign). Live
     * execution is Solana-side and out of scope for this adapter.
     */
    getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote>;
    /**
     * GET LP positions for a wallet (read-only). Position MUTATIONS (open,
     * increase, decrease, close) require signing a Solana transaction and are
     * OUT OF SCOPE for this adapter — see README.
     */
    listPositions(ownerPublicKey: string): Promise<PositionInfo[]>;
    /** Fetch + timeout + retry-with-backoff, returning parsed JSON. */
    private request;
}
