import { type PositionInput, type PositionResult } from "../types.js";
import type { SkillOptions } from "./analyzePool.js";
/**
 * Pure, deterministic mock of the Byreal "position management" skill. Simulates
 * the result of opening, adjusting, rebalancing or closing an LP position.
 */
export declare function managePositionMock(rawInput: PositionInput, options: SkillOptions): PositionResult;
