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
import { MockByrealAdapter } from "./mock.js";
import { LiveByrealAdapter } from "./live.js";
export * from "./types.js";
export { MockByrealAdapter } from "./mock.js";
export { LiveByrealAdapter, analyzePoolInfo } from "./live.js";
export { ByrealRestClient, ByrealRequestError, DEFAULT_BYREAL_API_URL, } from "./rest.js";
export { hashJson, SKILL_LABELS } from "./skills/proof.js";
/** True when `BYREAL_MOCK` is set to a truthy value. */
function mockEnvEnabled() {
    const raw = typeof process !== "undefined" ? process.env?.BYREAL_MOCK : undefined;
    if (!raw)
        return false;
    return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}
/**
 * Factory that returns a {@link ByrealSkillAdapter}. Returns the REAL
 * {@link LiveByrealAdapter} by default; returns the {@link MockByrealAdapter}
 * only when `mode: "mock"` is passed or `BYREAL_MOCK=true` is set in the env.
 */
export function createByrealAdapter(options = {}) {
    const { mode, ...rest } = options;
    const useMock = mode === "mock" || (mode === undefined && mockEnvEnabled());
    if (useMock) {
        return new MockByrealAdapter(rest);
    }
    return new LiveByrealAdapter(rest);
}
