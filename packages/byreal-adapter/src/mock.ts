import type { ByrealSkillAdapter } from "./index.js";
import type {
  PoolAnalysisInput,
  PoolAnalysisResult,
  PositionInput,
  PositionResult,
  SwapPreviewInput,
  SwapPreviewResult,
  TokenDiscoveryInput,
  TokenDiscoveryResult,
} from "./types.js";
import { analyzePoolMock } from "./skills/analyzePool.js";
import { discoverTokenMock } from "./skills/discoverToken.js";
import { previewSwapMock } from "./skills/previewSwap.js";
import { managePositionMock } from "./skills/managePosition.js";

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
export class MockByrealAdapter implements ByrealSkillAdapter {
  private readonly recordedOnMantle: boolean;

  constructor(options: MockByrealAdapterOptions = {}) {
    this.recordedOnMantle = options.recordedOnMantle ?? false;
  }

  async analyzePool(input: PoolAnalysisInput): Promise<PoolAnalysisResult> {
    return analyzePoolMock(input, { recordedOnMantle: this.recordedOnMantle });
  }

  async discoverToken(
    input: TokenDiscoveryInput,
  ): Promise<TokenDiscoveryResult> {
    return discoverTokenMock(input, {
      recordedOnMantle: this.recordedOnMantle,
    });
  }

  async previewSwap(input: SwapPreviewInput): Promise<SwapPreviewResult> {
    return previewSwapMock(input, { recordedOnMantle: this.recordedOnMantle });
  }

  async managePosition(input: PositionInput): Promise<PositionResult> {
    return managePositionMock(input, {
      recordedOnMantle: this.recordedOnMantle,
    });
  }
}
