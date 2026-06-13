/**
 * @spartarena/byreal-adapter
 *
 * A clean, strictly-typed adapter that exposes Byreal skills (pool analysis,
 * token discovery, swap preview, position read) to SpartArena.
 *
 * Byreal is a SOLANA DEX. By DEFAULT this ships a REAL REST client
 * ({@link LiveByrealAdapter}) that hits the live Byreal API for reads and quote
 * previews. A deterministic {@link MockByrealAdapter} is only used when
 * `BYREAL_MOCK=true` (or `mode: "mock"`), for offline tests/demos.
 *
 * Live LP execution / signing is Solana-side and out of scope here. Every
 * result carries a `proof` envelope (keccak256 `toolProofHash` of the REAL
 * response body via viem + `recordedOnMantle` flag) so the UI can surface
 * verifiable tool usage:
 *
 *   Tool used:          Byreal Pool Analysis
 *   Tool proof hash:    0x...
 *   Recorded on Mantle: yes
 */
import type { MockByrealAdapterOptions } from "./mock.js";
import type { LiveByrealAdapterOptions } from "./live.js";
import type { PoolAnalysisInput, PoolAnalysisResult, PositionInput, PositionResult, SwapPreviewInput, SwapPreviewResult, TokenDiscoveryInput, TokenDiscoveryResult } from "./types.js";
export * from "./types.js";
export { MockByrealAdapter } from "./mock.js";
export type { MockByrealAdapterOptions } from "./mock.js";
export { LiveByrealAdapter, analyzePoolInfo } from "./live.js";
export type { LiveByrealAdapterOptions, AnalyzePoolInfoOptions } from "./live.js";
export { ByrealRestClient, ByrealRequestError, DEFAULT_BYREAL_API_URL, } from "./rest.js";
export type { ByrealRestClientOptions, SimplePoolInfo, MintInfo, MintPriceMap, SwapQuote, PositionInfo, } from "./rest.js";
export { hashJson, SKILL_LABELS } from "./skills/proof.js";
export type { SkillId } from "./skills/proof.js";
/**
 * The public contract every Byreal adapter implementation must satisfy. The
 * SpartArena agent-runner depends on this interface, not on a concrete impl, so
 * the mock can be swapped for a live adapter without touching call sites.
 */
export interface ByrealSkillAdapter {
    analyzePool(input: PoolAnalysisInput): Promise<PoolAnalysisResult>;
    discoverToken(input: TokenDiscoveryInput): Promise<TokenDiscoveryResult>;
    previewSwap(input: SwapPreviewInput): Promise<SwapPreviewResult>;
    managePosition(input: PositionInput): Promise<PositionResult>;
}
/** Implementation selector for {@link createByrealAdapter}. */
export type ByrealAdapterMode = "live" | "mock";
export interface CreateByrealAdapterOptions extends MockByrealAdapterOptions, LiveByrealAdapterOptions {
    /**
     * Which implementation to construct. Defaults to `"live"` (the REAL Byreal
     * REST client). `"mock"` returns the deterministic offline mock. When `mode`
     * is omitted, the env var `BYREAL_MOCK=true` selects the mock; otherwise live.
     */
    mode?: ByrealAdapterMode;
}
/**
 * Factory that returns a {@link ByrealSkillAdapter}. Returns the REAL
 * {@link LiveByrealAdapter} by default; returns the {@link MockByrealAdapter}
 * only when `mode: "mock"` is passed or `BYREAL_MOCK=true` is set in the env.
 */
export declare function createByrealAdapter(options?: CreateByrealAdapterOptions): ByrealSkillAdapter;
