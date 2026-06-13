import { describe, expect, it, vi } from "vitest";
import { ByrealRestClient, ByrealRequestError } from "./rest.js";

/** Build a minimal fetch Response stand-in from a JSON body + status. */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/**
 * A faithful slice of the LIVE `api2.byreal.io` v2 pools response. The payload
 * is nested under `result.data.records`, mints live under `mintA.mintInfo`, and
 * `feeRate` is an object with `fixFeeRate` in parts-per-million (500ppm = 5bps).
 * These are exactly the shapes that previously made `listPools()` return [].
 */
const LIVE_POOLS_RESPONSE = {
  retCode: 0,
  retMsg: "",
  result: {
    success: true,
    data: {
      total: 110,
      pageNum: 1,
      pageSize: 10,
      records: [
        {
          poolAddress: "POOL_SOL_USDC",
          mintA: { mintInfo: { address: "MINT_SOL", symbol: "SOL", decimals: 9 }, price: "150" },
          mintB: { mintInfo: { address: "MINT_USDC", symbol: "USDC", decimals: 6 }, price: "1" },
          feeRate: { fixFeeRate: "500" },
          tvl: "2000000",
          volumeUsd24h: "1000000",
          feeApr24h: "0.25",
        },
        {
          poolAddress: "POOL_USDC_USDT",
          mintA: { mintInfo: { address: "MINT_USDC", symbol: "USDC", decimals: 6 }, price: "1" },
          mintB: { mintInfo: { address: "MINT_USDT", symbol: "USDT", decimals: 6 }, price: "1" },
          feeRate: { fixFeeRate: "100" },
          tvl: "5000000",
          volumeUsd24h: "8000000",
          feeApr24h: "0.42",
        },
      ],
    },
  },
};

describe("ByrealRestClient.listPools (live v2 shape)", () => {
  it("extracts pools nested under result.data.records", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(LIVE_POOLS_RESPONSE));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });

    const pools = await client.listPools({ pageSize: 10 });

    expect(pools).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("flattens nested mintInfo into addresses + symbols", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(LIVE_POOLS_RESPONSE));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });

    const [sol] = await client.listPools();
    expect(sol).toBeDefined();

    expect(sol!.poolAddress).toBe("POOL_SOL_USDC");
    expect(sol!.mintA).toBe("MINT_SOL");
    expect(sol!.mintB).toBe("MINT_USDC");
    expect(sol!.mintASymbol).toBe("SOL");
    expect(sol!.mintBSymbol).toBe("USDC");
    expect(sol!.tvl).toBe("2000000");
    expect(sol!.volumeUsd24h).toBe("1000000");
  });

  it("normalizes the feeRate ppm object to a fraction string (500ppm -> 0.0005)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(LIVE_POOLS_RESPONSE));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });

    const [sol, usdc] = await client.listPools();
    expect(sol).toBeDefined();
    expect(usdc).toBeDefined();

    // 500 / 1_000_000 = 0.0005  (i.e. 5 bps once multiplied by 10_000)
    expect(Number(sol!.feeRate)).toBeCloseTo(0.0005, 10);
    expect(Number(usdc!.feeRate)).toBeCloseTo(0.0001, 10);
  });

  it("still accepts the older flat shape (top-level data array)", async () => {
    const flat = {
      retCode: 0,
      data: {
        total: 1,
        data: [
          {
            poolAddress: "POOL_FLAT",
            mintA: { address: "A", symbol: "AAA" },
            mintB: { address: "B", symbol: "BBB" },
            feeRate: "0.003",
            tvl: "100",
            volume24h: "50",
            apr24h: "10",
          },
        ],
      },
    };
    const fetchImpl = vi.fn(async () => jsonResponse(flat));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });

    const [p] = await client.listPools();
    expect(p).toBeDefined();
    expect(p!.poolAddress).toBe("POOL_FLAT");
    expect(p!.mintASymbol).toBe("AAA");
    expect(p!.volumeUsd24h).toBe("50");
    expect(p!.feeApr24h).toBe("10");
    expect(p!.feeRate).toBe("0.003");
  });

  it("returns [] when the payload is empty rather than throwing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ retCode: 0, result: { data: { records: [] } } }));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });
    expect(await client.listPools()).toEqual([]);
  });

  it("throws ByrealRequestError on a hard 4xx", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ msg: "bad" }, 400));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 0 });
    await expect(client.listPools()).rejects.toBeInstanceOf(ByrealRequestError);
  });

  it("retries on a transient 500 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ msg: "err" }, 500))
      .mockResolvedValueOnce(jsonResponse(LIVE_POOLS_RESPONSE));
    const client = new ByrealRestClient({ fetchImpl, maxRetries: 2 });

    const pools = await client.listPools();
    expect(pools).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
