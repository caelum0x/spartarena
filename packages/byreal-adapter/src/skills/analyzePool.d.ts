import { type PoolAnalysisInput, type PoolAnalysisResult } from "../types.js";
export interface SkillOptions {
    recordedOnMantle: boolean;
}
/**
 * Pure, deterministic mock of the Byreal "pool analysis" skill. Given the same
 * input it always returns the same realistic analysis, which keeps demos and
 * tests stable. Validates input at the boundary and the output before return.
 */
export declare function analyzePoolMock(rawInput: PoolAnalysisInput, options: SkillOptions): PoolAnalysisResult;
