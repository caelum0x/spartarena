import type { ByrealSkillAdapter } from "./index.js";
import type { PoolAnalysisInput, PoolAnalysisResult, PositionInput, PositionResult, SwapPreviewInput, SwapPreviewResult, TokenDiscoveryInput, TokenDiscoveryResult } from "./types.js";
export interface MockByrealAdapterOptions {
    /**
     * Whether result proofs should be flagged as recorded on Mantle. The adapter
     * itself does not write on-chain (that is the agent-runner/backend's job); the
     * flag lets the UI render "Recorded on Mantle: yes" once the proof hash has
     * been written to the DecisionLedger. Defaults to `false`.
     */
    recordedOnMantle?: boolean;
}
/**
 * Deterministic, dependency-free mock implementation of {@link ByrealSkillAdapter}.
 *
 * Each method:
 *  - validates its input via zod (inside the skill function),
 *  - produces realistic, input-keyed deterministic data,
 *  - attaches a `proof` envelope containing a keccak256 `toolProofHash` of the
 *    result body and a `recordedOnMantle` flag.
 *
 * All methods are async to match the interface and to keep a live adapter
 * drop-in compatible, even though the computation is synchronous.
 */
export declare class MockByrealAdapter implements ByrealSkillAdapter {
    private readonly recordedOnMantle;
    constructor(options?: MockByrealAdapterOptions);
    analyzePool(input: PoolAnalysisInput): Promise<PoolAnalysisResult>;
    discoverToken(input: TokenDiscoveryInput): Promise<TokenDiscoveryResult>;
    previewSwap(input: SwapPreviewInput): Promise<SwapPreviewResult>;
    managePosition(input: PositionInput): Promise<PositionResult>;
}
