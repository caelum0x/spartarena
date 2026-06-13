import { SwapPreviewInputSchema, SwapPreviewResultSchema, } from "../types.js";
import { buildProof, clampScore, makeRng, round, seedFrom, } from "./proof.js";
/** Format a number as a fixed-decimal string for amounts (no float noise). */
function toAmountString(value, decimals = 6) {
    if (!Number.isFinite(value) || value < 0)
        return "0";
    return value.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}
/**
 * Pure, deterministic mock of the Byreal "swap preview" skill. Computes a
 * realistic quote (price, impact, min-out, route, gas) without touching a chain.
 */
export function previewSwapMock(rawInput, options) {
    const input = SwapPreviewInputSchema.parse(rawInput);
    const rng = makeRng(seedFrom(input));
    const amountIn = Number.parseFloat(input.amountIn);
    if (!Number.isFinite(amountIn) || amountIn <= 0) {
        throw new Error("amountIn must parse to a positive number");
    }
    // Deterministic mid price in [0.25, 4.25), then apply price impact.
    const midPrice = round(0.25 + rng() * 4, 6);
    const priceImpactPct = round(0.05 + rng() * 2.5, 4);
    const executionPrice = round(midPrice * (1 - priceImpactPct / 100), 6);
    const expectedOut = amountIn * executionPrice;
    const minOut = expectedOut * (1 - input.slippageBps / 10_000);
    const estimatedGasMnt = round(0.0005 + rng() * 0.004, 6);
    // Direct route unless a deterministic coin-flip routes through a hub asset.
    const route = rng() > 0.5
        ? [input.tokenIn, input.tokenOut]
        : [input.tokenIn, "MNT", input.tokenOut];
    const riskScore = clampScore(priceImpactPct * 18 + (input.slippageBps > 200 ? 20 : 0) + rng() * 10);
    const body = {
        chain: input.chain,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amountIn: input.amountIn,
        expectedAmountOut: toAmountString(expectedOut),
        minAmountOut: toAmountString(minOut),
        executionPrice,
        priceImpactPct,
        estimatedGasMnt: toAmountString(estimatedGasMnt),
        route,
        slippageBps: input.slippageBps,
        riskScore,
        humanSummary: `Swapping ${input.amountIn} ${input.tokenIn} -> ~` +
            `${toAmountString(expectedOut)} ${input.tokenOut} ` +
            `(price ${executionPrice}, impact ${priceImpactPct}%). ` +
            `Min received ${toAmountString(minOut)} ${input.tokenOut} at ` +
            `${input.slippageBps}bps slippage via ${route.join(" -> ")}. ` +
            `Risk ${riskScore}/100.`,
    };
    const result = {
        ...body,
        proof: buildProof("BYREAL_SWAP_PREVIEW", body, {
            recordedOnMantle: options.recordedOnMantle,
            source: "mock",
        }),
    };
    return SwapPreviewResultSchema.parse(result);
}
