import { TokenDiscoveryInputSchema, TokenDiscoveryResultSchema, } from "../types.js";
import { buildProof, clampScore, makeRng, round, seedFrom, } from "./proof.js";
/** A small, Mantle-flavored universe the mock draws candidates from. */
const TOKEN_UNIVERSE = [
    { symbol: "MNT", name: "Mantle" },
    { symbol: "mETH", name: "Mantle Staked Ether" },
    { symbol: "USDY", name: "Ondo US Dollar Yield" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "WETH", name: "Wrapped Ether" },
    { symbol: "cmETH", name: "Mantle Restaked ETH" },
    { symbol: "AGNI", name: "Agni Finance" },
    { symbol: "LEND", name: "Lendle" },
    { symbol: "MOE", name: "Merchant Moe" },
    { symbol: "PUFF", name: "Puff" },
];
/** Deterministically derive a 20-byte address from a seed string. */
function pseudoAddress(seed) {
    const hex = seedFromHex(seed);
    return `0x${hex}`;
}
function seedFromHex(seed) {
    // 40 hex chars derived deterministically from the input via the proof hasher.
    const hashSeed = seedFrom(seed);
    const rng = makeRng(hashSeed);
    let out = "";
    while (out.length < 40) {
        out += Math.floor(rng() * 16).toString(16);
    }
    return out.slice(0, 40);
}
/**
 * Pure, deterministic mock of the Byreal "token discovery" skill. Returns a
 * stable, realistic candidate set ranked by a blended liquidity/momentum score.
 */
export function discoverTokenMock(rawInput, options) {
    const input = TokenDiscoveryInputSchema.parse(rawInput);
    const rng = makeRng(seedFrom(input));
    const limit = Math.min(input.limit, TOKEN_UNIVERSE.length);
    const tokens = TOKEN_UNIVERSE.slice()
        .map((token) => {
        const marketCapUsd = round(1_000_000 + rng() * 250_000_000);
        const volume24hUsd = round(marketCapUsd * (0.01 + rng() * 0.3));
        const priceChange24hPct = round(-20 + rng() * 60);
        const liquidityScore = clampScore(35 + rng() * 65);
        const riskScore = clampScore(80 - liquidityScore * 0.5 + Math.abs(priceChange24hPct) * 0.6);
        const reason = priceChange24hPct >= 10
            ? "Strong 24h momentum with healthy liquidity depth."
            : priceChange24hPct <= -10
                ? "Sharp drawdown — possible mean-reversion or distress signal."
                : "Stable price action; suitable as a lower-volatility leg.";
        return {
            symbol: token.symbol,
            name: token.name,
            address: pseudoAddress(`${input.query}:${token.symbol}`),
            marketCapUsd,
            volume24hUsd,
            priceChange24hPct,
            liquidityScore,
            riskScore,
            reason,
        };
    })
        .sort((a, b) => b.liquidityScore - b.riskScore - (a.liquidityScore - a.riskScore))
        .slice(0, limit);
    const avgRisk = tokens.length === 0
        ? 0
        : tokens.reduce((sum, t) => sum + t.riskScore, 0) / tokens.length;
    const confidence = clampScore(85 - avgRisk * 0.3 + rng() * 6);
    const body = {
        chain: input.chain,
        query: input.query,
        tokens,
        confidence,
        humanSummary: `Discovered ${tokens.length} candidate token(s) for "${input.query}" on ` +
            `${input.chain}, ranked by blended liquidity and risk. ` +
            `Top pick: ${tokens[0]?.symbol ?? "none"}. Confidence ${confidence}/100.`,
    };
    const result = {
        ...body,
        proof: buildProof("BYREAL_TOKEN_DISCOVERY", body, {
            recordedOnMantle: options.recordedOnMantle,
            source: "mock",
        }),
    };
    return TokenDiscoveryResultSchema.parse(result);
}
