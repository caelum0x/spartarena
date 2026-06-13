import { PoolAnalysisInputSchema, PoolAnalysisResultSchema, PositionInputSchema, PositionResultSchema, SwapPreviewInputSchema, SwapPreviewResultSchema, TokenDiscoveryInputSchema, TokenDiscoveryResultSchema, } from "./types.js";
import { buildProof, clampScore, round } from "./skills/proof.js";
import { ByrealRestClient, } from "./rest.js";
/** Parse a Byreal money string into a finite non-negative number, defaulting to 0. */
function num(value, fallback = 0) {
    if (value === undefined)
        return fallback;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}
/** Raw integer string in base units for a decimal `amount` and `decimals`. */
function toBaseUnits(amount, decimals) {
    const [whole = "0", frac = ""] = amount.split(".");
    const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
    const combined = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "");
    return combined === "" ? "0" : combined;
}
/** Format a base-unit integer string back to a human decimal string. */
function fromBaseUnits(raw, decimals) {
    if (!/^\d+$/.test(raw))
        return "0";
    if (decimals === 0)
        return raw;
    const padded = raw.padStart(decimals + 1, "0");
    const whole = padded.slice(0, padded.length - decimals);
    const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
}
/**
 * Pure, deterministic analysis of a single already-fetched Byreal pool row.
 *
 * Extracted from {@link LiveByrealAdapter.analyzePool} so callers that have
 * already listed pools (e.g. a pool-board route) can analyze every row without
 * an extra per-pool detail round-trip. Given the same `pool` it always yields
 * the same body and the same keccak256 proof hash, so the value is verifiable.
 */
export function analyzePoolInfo(pool, options = {}) {
    const chain = options.chain ?? "mantle-sepolia";
    const tvlUsd = round(num(pool.tvl));
    const volume24hUsd = round(num(pool.volumeUsd24h));
    // Byreal `feeRate` is a fraction (e.g. 0.0025); convert to basis points.
    const feeBps = Math.round(num(pool.feeRate) * 10_000);
    // `feeApr24h` may be a fraction or a percent; normalize to percent.
    const feeAprRaw = num(pool.feeApr24h);
    const estimatedAprPct = round(feeAprRaw <= 1 ? feeAprRaw * 100 : feeAprRaw);
    const utilizationPct = tvlUsd > 0 ? round((volume24hUsd / tvlUsd) * 100) : 0;
    const liquidityRisk = tvlUsd < 250_000 ? 40 : tvlUsd < 1_000_000 ? 20 : 5;
    const utilizationRisk = utilizationPct > 90 ? 35 : utilizationPct < 10 ? 20 : 10;
    const riskScore = clampScore(liquidityRisk + utilizationRisk);
    const confidence = clampScore(85 - riskScore * 0.3);
    const pairLabel = options.pairLabel ??
        (pool.mintASymbol && pool.mintBSymbol
            ? `${pool.mintASymbol}/${pool.mintBSymbol}`
            : `POOL-${pool.poolAddress.slice(0, 6).toUpperCase()}`);
    const signals = [
        tvlUsd >= 1_000_000
            ? "Deep liquidity reduces slippage and impermanent-loss volatility."
            : "Shallow liquidity — size positions carefully to limit price impact.",
        utilizationPct > 90
            ? "Very high utilization signals strong fee generation but elevated volatility."
            : utilizationPct < 10
                ? "Low utilization — fee yield is likely thin relative to TVL."
                : "Balanced utilization with steady fee accrual.",
        `Estimated fee APR ~${estimatedAprPct}% at ${feeBps}bps.`,
    ];
    const body = {
        chain,
        poolAddress: pool.poolAddress,
        pairLabel,
        tvlUsd,
        volume24hUsd,
        feeBps,
        estimatedAprPct,
        utilizationPct,
        riskScore,
        confidence,
        signals,
        humanSummary: `${pairLabel} holds $${tvlUsd.toLocaleString()} TVL with ` +
            `$${volume24hUsd.toLocaleString()} 24h volume (${utilizationPct}% utilization). ` +
            `At ${feeBps}bps fees this implies ~${estimatedAprPct}% APR. ` +
            `Risk score ${riskScore}/100, confidence ${confidence}/100. (Byreal, Solana)`,
    };
    return PoolAnalysisResultSchema.parse({
        ...body,
        proof: buildProof("BYREAL_POOL_ANALYSIS", body, {
            recordedOnMantle: options.recordedOnMantle ?? false,
            source: "live",
        }),
    });
}
/**
 * REAL Byreal adapter. Maps the {@link ByrealSkillAdapter} interface onto the
 * live Byreal Solana REST API (reads + quote previews only).
 *
 *  - analyzePool   -> pool details (falls back to pools list)
 *  - discoverToken -> mint/list (search) + mint/price
 *  - previewSwap   -> router swap quote (no userPublicKey => preview)
 *  - managePosition-> position/list (READ ONLY; mutations are Solana-side / out of scope)
 */
export class LiveByrealAdapter {
    client;
    recordedOnMantle;
    constructor(options = {}) {
        const { recordedOnMantle, client, ...rest } = options;
        this.recordedOnMantle = recordedOnMantle ?? false;
        this.client = client ?? new ByrealRestClient(rest);
    }
    async analyzePool(rawInput) {
        const input = PoolAnalysisInputSchema.parse(rawInput);
        let pool = await this.client.getPoolDetails(input.poolAddress);
        if (!pool) {
            const list = await this.client.listPools({ pageSize: 50 });
            pool = list.find((p) => p.poolAddress === input.poolAddress) ?? null;
        }
        if (!pool) {
            throw new Error(`Byreal pool not found for address ${input.poolAddress}`);
        }
        return analyzePoolInfo(pool, {
            chain: input.chain,
            pairLabel: input.pairLabel,
            recordedOnMantle: this.recordedOnMantle,
        });
    }
    async discoverToken(rawInput) {
        const input = TokenDiscoveryInputSchema.parse(rawInput);
        const mints = await this.client.listMints({
            searchKey: input.query,
            pageSize: input.limit,
        });
        const top = mints.slice(0, input.limit);
        let priceMap = {};
        if (top.length > 0) {
            priceMap = await this.client
                .getMintPrices(top.map((m) => m.address))
                .catch(() => ({}));
        }
        const tokens = top.map((m) => {
            const volume24hUsd = round(num(m.volumeUsd24h));
            const marketCapUsd = round(num(m.marketCap));
            const priceChange24hPct = round(num(m.priceChange24h));
            // Liquidity proxied by volume magnitude; risk by volatility + thinness.
            const liquidityScore = clampScore(volume24hUsd > 5_000_000
                ? 90
                : volume24hUsd > 500_000
                    ? 65
                    : volume24hUsd > 50_000
                        ? 40
                        : 20);
            const riskScore = clampScore(80 - liquidityScore * 0.5 + Math.abs(priceChange24hPct) * 0.6);
            const reason = priceChange24hPct >= 10
                ? "Strong 24h momentum with healthy liquidity depth."
                : priceChange24hPct <= -10
                    ? "Sharp drawdown — possible mean-reversion or distress signal."
                    : "Stable price action; suitable as a lower-volatility leg.";
            return {
                symbol: m.symbol || m.address.slice(0, 6),
                name: m.name || m.symbol || m.address.slice(0, 6),
                address: m.address,
                marketCapUsd,
                volume24hUsd,
                priceChange24hPct,
                liquidityScore,
                riskScore,
                reason,
            };
        });
        const avgRisk = tokens.length === 0
            ? 0
            : tokens.reduce((s, t) => s + t.riskScore, 0) / tokens.length;
        const confidence = clampScore(80 - avgRisk * 0.3);
        void priceMap; // prices fetched for enrichment / future use
        const body = {
            chain: input.chain,
            query: input.query,
            tokens,
            confidence,
            humanSummary: `Discovered ${tokens.length} Byreal token(s) for "${input.query}" ` +
                `(Solana), ranked by blended liquidity and risk. ` +
                `Top pick: ${tokens[0]?.symbol ?? "none"}. Confidence ${confidence}/100.`,
        };
        return TokenDiscoveryResultSchema.parse({
            ...body,
            proof: buildProof("BYREAL_TOKEN_DISCOVERY", body, {
                recordedOnMantle: this.recordedOnMantle,
                source: "live",
            }),
        });
    }
    async previewSwap(rawInput) {
        const input = SwapPreviewInputSchema.parse(rawInput);
        // Resolve decimals for the input mint so we can build a base-unit amount.
        const mints = await this.client
            .listMints({ searchKey: input.tokenIn, pageSize: 5 })
            .catch(() => []);
        const inMint = mints.find((m) => m.address === input.tokenIn) ??
            mints.find((m) => m.symbol === input.tokenIn) ??
            mints[0];
        const outMintList = await this.client
            .listMints({ searchKey: input.tokenOut, pageSize: 5 })
            .catch(() => []);
        const outMint = outMintList.find((m) => m.address === input.tokenOut) ??
            outMintList.find((m) => m.symbol === input.tokenOut) ??
            outMintList[0];
        const inDecimals = inMint?.decimals ?? 9;
        const outDecimals = outMint?.decimals ?? 9;
        const inputMintAddr = inMint?.address ?? input.tokenIn;
        const outputMintAddr = outMint?.address ?? input.tokenOut;
        const quote = await this.client.getSwapQuote({
            inputMint: inputMintAddr,
            outputMint: outputMintAddr,
            amount: toBaseUnits(input.amountIn, inDecimals),
            swapMode: "in",
            slippageBps: String(input.slippageBps),
        });
        const expectedAmountOut = fromBaseUnits(quote.outAmount ?? "0", outDecimals);
        const minAmountOut = fromBaseUnits(quote.otherAmountThreshold ?? quote.outAmount ?? "0", outDecimals);
        const amountInNum = Number.parseFloat(input.amountIn);
        const expectedOutNum = Number.parseFloat(expectedAmountOut);
        const executionPrice = amountInNum > 0 ? round(expectedOutNum / amountInNum, 8) : 0;
        const piRaw = num(quote.priceImpactPct);
        // Byreal returns priceImpactPct as a fraction (e.g. 0.0012) most often.
        const priceImpactPct = round(Math.abs(piRaw <= 1 ? piRaw * 100 : piRaw), 4);
        const route = quote.poolAddresses && quote.poolAddresses.length > 0
            ? [input.tokenIn, ...quote.poolAddresses, input.tokenOut]
            : [input.tokenIn, input.tokenOut];
        const riskScore = clampScore(priceImpactPct * 18 + (input.slippageBps > 200 ? 20 : 0));
        const body = {
            chain: input.chain,
            tokenIn: input.tokenIn,
            tokenOut: input.tokenOut,
            amountIn: input.amountIn,
            expectedAmountOut: expectedAmountOut || "0",
            minAmountOut: minAmountOut || "0",
            executionPrice,
            priceImpactPct,
            // Byreal is on Solana — there is no MNT gas. Report 0 (informational).
            estimatedGasMnt: "0",
            route,
            slippageBps: input.slippageBps,
            riskScore,
            humanSummary: `Byreal (Solana) preview: ${input.amountIn} ${input.tokenIn} -> ~` +
                `${expectedAmountOut || "0"} ${input.tokenOut} ` +
                `(price ${executionPrice}, impact ${priceImpactPct}%). ` +
                `Min received ${minAmountOut || "0"} ${input.tokenOut} at ` +
                `${input.slippageBps}bps slippage. Risk ${riskScore}/100. ` +
                `Preview only — execution requires a Solana wallet (out of scope).`,
        };
        return SwapPreviewResultSchema.parse({
            ...body,
            proof: buildProof("BYREAL_SWAP_PREVIEW", body, {
                recordedOnMantle: this.recordedOnMantle,
                source: "live",
            }),
        });
    }
    /**
     * READ-ONLY position management. Byreal LP mutations (open/increase/decrease/
     * close/rebalance) require signing a Solana transaction and are OUT OF SCOPE
     * for this adapter. We read the live position list (treating `poolAddress` as
     * the owner's public key when no positionId is given is NOT valid, so callers
     * pass the owner via `positionId`) and report it without mutating.
     */
    async managePosition(rawInput) {
        const input = PositionInputSchema.parse(rawInput);
        // Treat `positionId` as the Solana owner public key for the read.
        const owner = input.positionId;
        const positions = owner
            ? await this.client.listPositions(owner).catch(() => [])
            : [];
        const match = positions.find((p) => p.poolAddress === input.poolAddress) ??
            positions[0];
        const isMutation = input.action !== "open" || input.amount !== undefined;
        const liquidity = match?.liquidity ?? "0";
        const valueUsd = round(num(match?.valueUsd));
        const feesEarnedUsd = round(num(match?.feesUsd));
        const positionId = match?.positionId ?? owner ?? "unknown";
        const status = Number.parseFloat(liquidity) > 0 ? "open" : "closed";
        const recommendations = [
            "Position MUTATIONS (open/increase/decrease/close/rebalance) execute on " +
                "Solana and require a wallet signature — OUT OF SCOPE for this adapter. " +
                "Use @byreal-io/byreal-cli or the byreal-clmm-sdk for live LP execution.",
        ];
        if (status === "open") {
            recommendations.push("Monitor the price band; rebalance on Solana if the pair drifts out of range.");
        }
        const body = {
            chain: input.chain,
            positionId,
            poolAddress: input.poolAddress,
            action: input.action,
            status,
            liquidity: liquidity || "0",
            valueUsd,
            feesEarnedUsd,
            riskScore: clampScore(status === "open" ? 25 : 0),
            recommendations,
            humanSummary: `Byreal (Solana) position read for pool ${input.poolAddress}: ` +
                `status ${status}, liquidity ${liquidity}, value $${valueUsd.toLocaleString()}, ` +
                `unclaimed fees $${feesEarnedUsd.toLocaleString()}. ` +
                (isMutation
                    ? `Requested action "${input.action}" is a MUTATION and is Solana-side / out of scope — reported read-only state.`
                    : `Read-only.`),
        };
        return PositionResultSchema.parse({
            ...body,
            proof: buildProof("BYREAL_POSITION_MANAGEMENT", body, {
                recordedOnMantle: this.recordedOnMantle,
                source: "live",
            }),
        });
    }
}
