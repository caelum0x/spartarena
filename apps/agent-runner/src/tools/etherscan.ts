import { z } from "zod";
import { postJson } from "../llm/http.js";
import { withBackoff, isTransient } from "../util/retry.js";

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";
const DEFAULT_TIMEOUT_MS = Number(process.env.ETHERSCAN_TIMEOUT_MS ?? 15_000);

/** One ERC-20 transfer row from Etherscan-V2 `action=tokentx`. */
export const TokenTxSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  tokenSymbol: z.string(),
  tokenName: z.string().optional(),
  tokenDecimal: z.string(),
  contractAddress: z.string(),
});
export type TokenTx = z.infer<typeof TokenTxSchema>;

/** Etherscan response envelope: status "1" ok, "0" with NOTOK/empty result. */
const TokenTxResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  result: z.union([z.array(TokenTxSchema), z.string()]),
});

export interface EtherscanConfig {
  apiKey: string;
  chainId: number;
}

/**
 * Thin Etherscan-V2 client (one key, all chains). Reads ERC-20 transfer history
 * for a wallet. Free tier is 5 req/s — calls go through exponential backoff.
 */
export class EtherscanClient {
  constructor(private readonly config: EtherscanConfig) {}

  /** Recent ERC-20 transfers (newest first) for `address`. */
  async tokenTransfers(address: string, offset = 50): Promise<TokenTx[]> {
    const url = new URL(ETHERSCAN_V2_BASE);
    url.searchParams.set("chainid", String(this.config.chainId));
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "tokentx");
    url.searchParams.set("address", address);
    url.searchParams.set("page", "1");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("sort", "desc");
    url.searchParams.set("apikey", this.config.apiKey);

    const raw = await withBackoff(() => getJson(url.toString()), {
      shouldRetry: isTransient,
    });

    const parsed = TokenTxResponseSchema.parse(raw);
    if (Array.isArray(parsed.result)) {
      return parsed.result;
    }
    // status "0" with a string result. "No transactions found" is a valid empty
    // result; anything else (e.g. "NOTOK" rate limit) is a real error.
    if (/no transactions found/i.test(parsed.message) || /no transactions found/i.test(parsed.result)) {
      return [];
    }
    throw new Error(`Etherscan tokentx error: ${parsed.message} (${parsed.result})`);
  }
}

/** GET helper mirroring `postJson` (native fetch + AbortController timeout). */
async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Expected JSON but got: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Etherscan request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
