import { type TokenDiscoveryInput, type TokenDiscoveryResult } from "../types.js";
import type { SkillOptions } from "./analyzePool.js";
/**
 * Pure, deterministic mock of the Byreal "token discovery" skill. Returns a
 * stable, realistic candidate set ranked by a blended liquidity/momentum score.
 */
export declare function discoverTokenMock(rawInput: TokenDiscoveryInput, options: SkillOptions): TokenDiscoveryResult;
