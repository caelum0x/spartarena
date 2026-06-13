import { type SwapPreviewInput, type SwapPreviewResult } from "../types.js";
import type { SkillOptions } from "./analyzePool.js";
/**
 * Pure, deterministic mock of the Byreal "swap preview" skill. Computes a
 * realistic quote (price, impact, min-out, route, gas) without touching a chain.
 */
export declare function previewSwapMock(rawInput: SwapPreviewInput, options: SkillOptions): SwapPreviewResult;
