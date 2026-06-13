import type { ByrealSkillAdapter } from "./index.js";
import { type ByrealChain, type PoolAnalysisInput, type PoolAnalysisResult, type PositionInput, type PositionResult, type SwapPreviewInput, type SwapPreviewResult, type TokenDiscoveryInput, type TokenDiscoveryResult } from "./types.js";
import { ByrealRestClient, type ByrealRestClientOptions, type SimplePoolInfo } from "./rest.js";
export interface LiveByrealAdapterOptions extends ByrealRestClientOptions {
    /**
     * Whether result proofs should be flagged as recorded on Mantle. The adapter
     * does not write on-chain itself; the backend/agent-runner records the proof
     * hash to the DecisionLedger and flips this flag. Defaults to `false`.
     */
    recordedOnMantle?: boolean;
    /** Inject a pre-built client (e.g. for tests). */
    client?: ByrealRestClient;
}
/** Options controlling how a {@link SimplePoolInfo} is turned into analysis. */
export interface AnalyzePoolInfoOptions {
    /** Settlement/data chain label recorded in the analysis body. */
    chain?: ByrealChain;
    /** Optional human label; derived from the pool's mint symbols when absent. */
    pairLabel?: string;
    /** Whether the resulting proof hash is flagged as recorded on Mantle. */
    recordedOnMantle?: boolean;
}
/**
 * Pure, deterministic analysis of a single already-fetched Byreal pool row.
 *
 * Extracted from {@link LiveByrealAdapter.analyzePool} so callers that have
 * already listed pools (e.g. a pool-board route) can analyze every row without
 * an extra per-pool detail round-trip. Given the same `pool` it always yields
 * the same body and the same keccak256 proof hash, so the value is verifiable.
 */
export declare function analyzePoolInfo(pool: SimplePoolInfo, options?: AnalyzePoolInfoOptions): PoolAnalysisResult;
/**
 * REAL Byreal adapter. Maps the {@link ByrealSkillAdapter} interface onto the
 * live Byreal Solana REST API (reads + quote previews only).
 *
 *  - analyzePool   -> pool details (falls back to pools list)
 *  - discoverToken -> mint/list (search) + mint/price
 *  - previewSwap   -> router swap quote (no userPublicKey => preview)
 *  - managePosition-> position/list (READ ONLY; mutations are Solana-side / out of scope)
 */
export declare class LiveByrealAdapter implements ByrealSkillAdapter {
    private readonly client;
    private readonly recordedOnMantle;
    constructor(options?: LiveByrealAdapterOptions);
    analyzePool(rawInput: PoolAnalysisInput): Promise<PoolAnalysisResult>;
    discoverToken(rawInput: TokenDiscoveryInput): Promise<TokenDiscoveryResult>;
    previewSwap(rawInput: SwapPreviewInput): Promise<SwapPreviewResult>;
    /**
     * READ-ONLY position management. Byreal LP mutations (open/increase/decrease/
     * close/rebalance) require signing a Solana transaction and are OUT OF SCOPE
     * for this adapter. We read the live position list (treating `poolAddress` as
     * the owner's public key when no positionId is given is NOT valid, so callers
     * pass the owner via `positionId`) and report it without mutating.
     */
    managePosition(rawInput: PositionInput): Promise<PositionResult>;
}
