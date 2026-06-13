import { analyzePoolMock } from "./skills/analyzePool.js";
import { discoverTokenMock } from "./skills/discoverToken.js";
import { previewSwapMock } from "./skills/previewSwap.js";
import { managePositionMock } from "./skills/managePosition.js";
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
export class MockByrealAdapter {
    recordedOnMantle;
    constructor(options = {}) {
        this.recordedOnMantle = options.recordedOnMantle ?? false;
    }
    async analyzePool(input) {
        return analyzePoolMock(input, { recordedOnMantle: this.recordedOnMantle });
    }
    async discoverToken(input) {
        return discoverTokenMock(input, {
            recordedOnMantle: this.recordedOnMantle,
        });
    }
    async previewSwap(input) {
        return previewSwapMock(input, { recordedOnMantle: this.recordedOnMantle });
    }
    async managePosition(input) {
        return managePositionMock(input, {
            recordedOnMantle: this.recordedOnMantle,
        });
    }
}
