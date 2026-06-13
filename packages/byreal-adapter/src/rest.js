import { z } from "zod";
/**
 * Real Byreal REST client.
 *
 * Byreal is a SOLANA DEX. This client is READ/QUOTE-ONLY: it lists pools and
 * tokens, fetches pool details and mint prices, and previews swap quotes WITHOUT
 * a wallet (no `userPublicKey` => the router returns a non-executable preview).
 * Live LP execution / signing is Solana-side and out of scope here.
 *
 * Money fields in Byreal responses are STRINGS (to preserve precision). We keep
 * them as strings in the parsed shape and parse to numbers only at the adapter
 * boundary, carefully.
 *
 * All responses are validated with zod. Requests use native fetch with an
 * AbortController timeout and bounded retries with exponential backoff.
 */
/** Default Byreal API base URL (no auth required for reads/quotes). */
export const DEFAULT_BYREAL_API_URL = "https://api2.byreal.io";
/* -------------------------------------------------------------------------- */
/* Response schemas                                                           */
/* -------------------------------------------------------------------------- */
/**
 * Byreal wraps responses in an envelope. The exact field names vary across
 * endpoints, so we accept the common shapes and normalize. The live v2 API
 * nests the real payload under `result` (e.g. `{ retCode, result: { success,
 * data } }`); older/simpler shapes put it directly under `data`. We accept both
 * and {@link envelopePayload} picks whichever is present.
 */
const ByrealEnvelopeSchema = (data) => z.object({
    // Some endpoints use `code`/`ret_code`, some use `retCode`. Keep loose.
    code: z.union([z.number(), z.string()]).optional(),
    retCode: z.union([z.number(), z.string()]).optional(),
    msg: z.string().optional(),
    retMsg: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean().optional(),
    data: data.nullable().optional(),
    result: z
        .object({
        success: z.boolean().optional(),
        data: data.nullable().optional(),
    })
        .nullable()
        .optional(),
});
/** Extract the payload from a parsed envelope, preferring the `result` wrapper. */
function envelopePayload(parsed) {
    return parsed.result?.data ?? parsed.data ?? null;
}
/**
 * A page of results. The live v2 API returns rows under `records` (alongside
 * `total`/`pageNum`/`pageSize`); other shapes use `data`. We accept both and
 * normalize the rows onto `data` so callers read a single field.
 */
const PageResultSchema = (item) => z
    .object({
    count: z.union([z.number(), z.string()]).optional(),
    total: z.union([z.number(), z.string()]).optional(),
    pageNum: z.union([z.number(), z.string()]).optional(),
    pageSize: z.union([z.number(), z.string()]).optional(),
    hasNextPage: z.boolean().optional(),
    data: z.array(item).optional(),
    records: z.array(item).optional(),
})
    .transform((p) => ({
    count: p.count,
    total: p.total,
    hasNextPage: p.hasNextPage,
    data: p.data ?? p.records ?? [],
}));
/** Money values arrive as strings; allow numbers defensively and coerce later. */
const MoneyString = z.union([z.string(), z.number()]).transform((v) => String(v));
/**
 * SimplePoolInfo — a single pool row from the pools list / details endpoints.
 * Byreal returns far more fields than we model; we keep the ones the adapter
 * needs and let zod strip the rest via `.passthrough()`-free strict-but-partial
 * parsing (unknown fields are dropped by default in zod object parsing).
 */
/**
 * A pool's mint node. The live v2 API nests the token under `mintInfo`
 * (`{ mintInfo: { address, symbol, ... }, price }`); simpler shapes put the
 * fields flat on the node. Accept both.
 */
const MintNodeSchema = z
    .object({
    address: z.string().optional(),
    symbol: z.string().optional(),
    name: z.string().optional(),
    decimals: z.number().int().optional(),
    mintInfo: z
        .object({
        address: z.string().optional(),
        symbol: z.string().optional(),
        name: z.string().optional(),
        decimals: z.number().int().optional(),
    })
        .optional(),
})
    .transform((m) => ({
    address: m.mintInfo?.address ?? m.address,
    symbol: m.mintInfo?.symbol ?? m.symbol,
    name: m.mintInfo?.name ?? m.name,
    decimals: m.mintInfo?.decimals ?? m.decimals,
}));
/**
 * Pool fee. The live v2 API returns an object (`{ fixFeeRate: "500", ... }`)
 * where `fixFeeRate` is in parts-per-million (500ppm = 5bps); simpler shapes
 * return a money-string fraction (e.g. "0.0005"). Normalize to a fraction
 * string so the adapter's `feeRate * 10_000 = bps` math holds for both.
 */
const FeeRateSchema = z
    .union([
    z
        .object({ fixFeeRate: z.union([z.string(), z.number()]).optional() })
        .transform((f) => {
        const ppm = Number(f.fixFeeRate ?? 0);
        return Number.isFinite(ppm) ? String(ppm / 1_000_000) : undefined;
    }),
    MoneyString,
])
    .optional();
export const SimplePoolInfoSchema = z
    .object({
    poolAddress: z.string().min(1),
    mintA: MintNodeSchema.optional(),
    mintB: MintNodeSchema.optional(),
    // Some list shapes use flat mint addresses instead of nested objects.
    mintAddressA: z.string().optional(),
    mintAddressB: z.string().optional(),
    feeRate: FeeRateSchema,
    price: MoneyString.optional(),
    tvl: MoneyString.optional(),
    volumeUsd24h: MoneyString.optional(),
    volume24h: MoneyString.optional(),
    feeApr24h: MoneyString.optional(),
    apr24h: MoneyString.optional(),
})
    .transform((p) => ({
    poolAddress: p.poolAddress,
    mintA: p.mintA?.address ?? p.mintAddressA,
    mintB: p.mintB?.address ?? p.mintAddressB,
    mintASymbol: p.mintA?.symbol,
    mintBSymbol: p.mintB?.symbol,
    feeRate: p.feeRate,
    price: p.price,
    tvl: p.tvl,
    volumeUsd24h: p.volumeUsd24h ?? p.volume24h,
    feeApr24h: p.feeApr24h ?? p.apr24h,
}));
/** Token/mint metadata from the mint list / hot endpoints. */
export const MintInfoSchema = z
    .object({
    address: z.string().min(1),
    symbol: z.string().optional().default(""),
    name: z.string().optional().default(""),
    decimals: z.number().int().nonnegative().optional().default(0),
    logoURI: z.string().optional(),
    price: MoneyString.optional(),
    volumeUsd24h: MoneyString.optional(),
    marketCap: MoneyString.optional(),
    priceChange24h: MoneyString.optional(),
})
    .transform((m) => ({
    address: m.address,
    symbol: m.symbol,
    name: m.name,
    decimals: m.decimals,
    logoURI: m.logoURI,
    price: m.price,
    volumeUsd24h: m.volumeUsd24h,
    marketCap: m.marketCap,
    priceChange24h: m.priceChange24h,
}));
/** Mint price map: `{ [mintAddress]: priceString }`. */
export const MintPriceSchema = z.record(z.string(), MoneyString);
/** Router swap quote (preview — no wallet attached). */
export const SwapQuoteSchema = z
    .object({
    result: z
        .object({
        retCode: z.union([z.number(), z.string()]).optional(),
        retMsg: z.string().optional(),
    })
        .optional(),
    inputMint: z.string().optional(),
    outputMint: z.string().optional(),
    inAmount: MoneyString.optional(),
    outAmount: MoneyString.optional(),
    otherAmountThreshold: MoneyString.optional(),
    priceImpactPct: MoneyString.optional(),
    swapMode: z.string().optional(),
    slippageBps: z.union([z.number(), z.string()]).optional(),
    poolAddresses: z.array(z.string()).optional().default([]),
    routerType: z.string().optional(),
})
    .transform((q) => ({
    retCode: q.result?.retCode,
    retMsg: q.result?.retMsg,
    inputMint: q.inputMint,
    outputMint: q.outputMint,
    inAmount: q.inAmount,
    outAmount: q.outAmount,
    otherAmountThreshold: q.otherAmountThreshold,
    priceImpactPct: q.priceImpactPct,
    swapMode: q.swapMode,
    slippageBps: q.slippageBps === undefined ? undefined : String(q.slippageBps),
    poolAddresses: q.poolAddresses,
    routerType: q.routerType,
}));
/** An LP position row (read-only). Mutations are Solana-side, out of scope. */
export const PositionInfoSchema = z
    .object({
    positionId: z.string().optional(),
    nftMint: z.string().optional(),
    poolAddress: z.string().optional(),
    liquidity: MoneyString.optional(),
    tickLower: z.number().int().optional(),
    tickUpper: z.number().int().optional(),
    amountA: MoneyString.optional(),
    amountB: MoneyString.optional(),
    valueUsd: MoneyString.optional(),
    feesUsd: MoneyString.optional(),
})
    .transform((p) => ({
    positionId: p.positionId ?? p.nftMint,
    poolAddress: p.poolAddress,
    liquidity: p.liquidity,
    tickLower: p.tickLower,
    tickUpper: p.tickUpper,
    amountA: p.amountA,
    amountB: p.amountB,
    valueUsd: p.valueUsd,
    feesUsd: p.feesUsd,
}));
/** Thrown for any non-recoverable Byreal request failure. */
export class ByrealRequestError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = "ByrealRequestError";
        this.status = status;
    }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export class ByrealRestClient {
    baseUrl;
    timeoutMs;
    maxRetries;
    fetchImpl;
    constructor(options = {}) {
        const envBase = typeof process !== "undefined" ? process.env?.BYREAL_API_URL : undefined;
        this.baseUrl = (options.baseUrl ??
            envBase ??
            DEFAULT_BYREAL_API_URL).replace(/\/+$/, "");
        this.timeoutMs = options.timeoutMs ?? 15_000;
        this.maxRetries = options.maxRetries ?? 2;
        const f = options.fetchImpl ?? globalThis.fetch;
        if (typeof f !== "function") {
            throw new Error("global fetch is not available; pass options.fetchImpl (Node >= 18 required).");
        }
        this.fetchImpl = f;
    }
    /** GET pools list, validate + normalize to {@link SimplePoolInfo}[]. */
    async listPools(params = {}) {
        const query = new URLSearchParams({
            sortField: params.sortField ?? "tvl",
            sortType: params.sortType ?? "desc",
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? 20),
        });
        const raw = await this.request(`/byreal/api/dex/v2/pools/info/list?${query.toString()}`, { method: "GET" });
        const parsed = ByrealEnvelopeSchema(PageResultSchema(SimplePoolInfoSchema)).parse(raw);
        return envelopePayload(parsed)?.data ?? [];
    }
    /** GET a single pool's details by address. */
    async getPoolDetails(poolAddress) {
        if (!poolAddress)
            throw new Error("poolAddress is required");
        const query = new URLSearchParams({ poolAddress });
        const raw = await this.request(`/byreal/api/dex/v2/pools/details?${query.toString()}`, { method: "GET" });
        // Detail endpoint may return a single object or a one-element page.
        const parsed = ByrealEnvelopeSchema(z.union([SimplePoolInfoSchema, PageResultSchema(SimplePoolInfoSchema)])).parse(raw);
        const data = envelopePayload(parsed);
        if (!data)
            return null;
        if ("data" in data && Array.isArray(data.data)) {
            return data.data[0] ?? null;
        }
        return data;
    }
    /** GET token/mint list (discovery), validate + normalize to {@link MintInfo}[]. */
    async listMints(params = {}) {
        const query = new URLSearchParams({
            sortField: params.sortField ?? "volumeUsd24h",
            sortType: params.sortType ?? "desc",
            page: String(params.page ?? 1),
            pageSize: String(params.pageSize ?? 20),
        });
        if (params.searchKey)
            query.set("searchKey", params.searchKey);
        const raw = await this.request(`/byreal/api/dex/v2/mint/list?${query.toString()}`, { method: "GET" });
        const parsed = ByrealEnvelopeSchema(z.union([PageResultSchema(MintInfoSchema), z.array(MintInfoSchema)])).parse(raw);
        const data = envelopePayload(parsed);
        if (!data)
            return [];
        return Array.isArray(data) ? data : data.data;
    }
    /** GET mint prices for one or more mint addresses. */
    async getMintPrices(mints) {
        if (mints.length === 0)
            return {};
        const query = new URLSearchParams({ mints: mints.join(",") });
        const raw = await this.request(`/byreal/api/dex/v2/mint/price?${query.toString()}`, { method: "GET" });
        const parsed = ByrealEnvelopeSchema(MintPriceSchema).parse(raw);
        return envelopePayload(parsed) ?? {};
    }
    /**
     * POST a swap quote PREVIEW. We intentionally omit `userPublicKey`, so the
     * router returns a non-executable preview (no transaction to sign). Live
     * execution is Solana-side and out of scope for this adapter.
     */
    async getSwapQuote(params) {
        if (!params.inputMint || !params.outputMint) {
            throw new Error("inputMint and outputMint are required");
        }
        if (!/^\d+$/.test(params.amount)) {
            throw new Error("amount must be a base-unit integer string");
        }
        const body = {
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            amount: params.amount,
            swapMode: params.swapMode ?? "in",
            slippageBps: params.slippageBps ?? "50",
            // NOTE: deliberately NO userPublicKey => preview only.
        };
        const raw = await this.request("/byreal/api/router/v1/router-service/swap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        // Some deployments wrap the quote in the standard envelope, some return it
        // at the top level. Accept both.
        const enveloped = ByrealEnvelopeSchema(SwapQuoteSchema).safeParse(raw);
        if (enveloped.success) {
            const payload = envelopePayload(enveloped.data);
            if (payload)
                return payload;
        }
        return SwapQuoteSchema.parse(raw);
    }
    /**
     * GET LP positions for a wallet (read-only). Position MUTATIONS (open,
     * increase, decrease, close) require signing a Solana transaction and are
     * OUT OF SCOPE for this adapter — see README.
     */
    async listPositions(ownerPublicKey) {
        if (!ownerPublicKey)
            throw new Error("ownerPublicKey is required");
        const query = new URLSearchParams({ ownerPublicKey });
        const raw = await this.request(`/byreal/api/dex/v2/position/list?${query.toString()}`, { method: "GET" });
        const parsed = ByrealEnvelopeSchema(z.union([
            PageResultSchema(PositionInfoSchema),
            z.array(PositionInfoSchema),
        ])).parse(raw);
        const data = envelopePayload(parsed);
        if (!data)
            return [];
        return Array.isArray(data) ? data : data.data;
    }
    /* ------------------------------------------------------------------------ */
    /* Internals                                                                */
    /* ------------------------------------------------------------------------ */
    /** Fetch + timeout + retry-with-backoff, returning parsed JSON. */
    async request(path, init) {
        const url = `${this.baseUrl}${path}`;
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const res = await this.fetchImpl(url, {
                    ...init,
                    signal: controller.signal,
                    headers: { accept: "application/json", ...init.headers },
                });
                // Retry on 429 + 5xx (transient). 4xx (other) is a hard failure.
                if (res.status === 429 || res.status >= 500) {
                    throw new ByrealRequestError(`Byreal ${res.status} for ${path}`, res.status);
                }
                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new ByrealRequestError(`Byreal ${res.status} for ${path}: ${text.slice(0, 200)}`, res.status);
                }
                const text = await res.text();
                try {
                    return text ? JSON.parse(text) : {};
                }
                catch {
                    throw new ByrealRequestError(`Byreal returned non-JSON for ${path}: ${text.slice(0, 200)}`, res.status);
                }
            }
            catch (error) {
                lastError = error;
                const status = error instanceof ByrealRequestError ? error.status : undefined;
                const retriable = status === 429 ||
                    status === undefined || // network / abort / timeout
                    (status >= 500 && status < 600);
                if (!retriable || attempt === this.maxRetries)
                    break;
                // Exponential backoff with jitter: 250ms, 500ms, 1000ms, ...
                const backoff = 250 * 2 ** attempt + Math.floor(Math.random() * 100);
                await sleep(backoff);
            }
            finally {
                clearTimeout(timer);
            }
        }
        if (lastError instanceof Error) {
            throw new ByrealRequestError(`Byreal request failed for ${path}: ${lastError.message}`);
        }
        throw new ByrealRequestError(`Byreal request failed for ${path}`);
    }
}
