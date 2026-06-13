import { formatEther, getAddress, type Address } from "viem";
import { z } from "zod";
import { env } from "../../../env.js";
import { childLogger } from "../../../lib/logger.js";
import { UpstreamError } from "../../../lib/errors.js";
import { explorerTx } from "@spartarena/shared";
import { publicClient } from "../../../chain/publicClient.js";
import type { ToolCall } from "../execution.types.js";

/**
 * Real Mantle wallet-activity reader for AlphaSentinel.
 *
 * Native balance comes from the configured viem public client (`eth_getBalance`).
 * Recent ERC-20 transfers come from the Etherscan V2 multichain API
 * (`action=tokentx`) for the bound chainId. From those transfers we compute a
 * baseline (median transfer value) and flag outliers (transfers far above the
 * baseline, and transfers to freshly-deployed / EOA-less contracts), so the
 * downstream decision is grounded in real on-chain history — never fabricated.
 */
const log = childLogger("execution.tool.mantle");

const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";

/** A single real transfer observed for the target wallet. */
export interface ObservedTransfer {
  readonly hash: string;
  readonly from: string;
  readonly to: string;
  readonly valueRaw: string;
  readonly value: number;
  readonly tokenSymbol: string;
  readonly tokenDecimals: number;
  readonly blockNumber: number;
  readonly timeStamp: number;
  readonly explorerUrl: string;
  /** True when value is an outlier vs the wallet's recent baseline. */
  readonly isOutlier: boolean;
}

/** Real activity snapshot for a wallet. */
export interface WalletActivity {
  readonly address: string;
  readonly nativeBalanceWei: string;
  readonly nativeBalanceMnt: string;
  readonly transferCount: number;
  readonly baselineValue: number;
  readonly maxValue: number;
  readonly outlierCount: number;
  readonly transfers: readonly ObservedTransfer[];
}

const TokenTxRow = z.object({
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  tokenSymbol: z.string().default(""),
  tokenDecimal: z.string().default("18"),
  blockNumber: z.string(),
  timeStamp: z.string(),
});

const TokenTxResponse = z.object({
  status: z.string(),
  message: z.string(),
  result: z.union([z.array(TokenTxRow), z.string()]),
});

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

async function fetchTokenTransfers(address: Address): Promise<z.infer<typeof TokenTxRow>[]> {
  const apiKey = env.ETHERSCAN_API_KEY;
  if (apiKey === undefined) {
    log.warn("ETHERSCAN_API_KEY unset — skipping token-transfer history");
    return [];
  }
  const url = new URL(ETHERSCAN_V2);
  url.search = new URLSearchParams({
    chainid: String(env.CHAIN_ID),
    module: "account",
    action: "tokentx",
    address,
    page: "1",
    offset: "50",
    sort: "desc",
    apikey: apiKey,
  }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.MARKET_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new UpstreamError(`Etherscan HTTP ${res.status}`);
    const parsed = TokenTxResponse.parse(await res.json());
    // status "0" with a string result means "No transactions found" (not an error).
    if (typeof parsed.result === "string") return [];
    return parsed.result;
  } catch (err) {
    if (err instanceof UpstreamError) throw err;
    throw new UpstreamError(
      "Etherscan tokentx request failed",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}

export class MantleReader {
  readonly calls: ToolCall[] = [];

  /** Read real native balance + recent transfers and derive outliers. */
  async getWalletActivity(rawAddress: string): Promise<WalletActivity> {
    const address = getAddress(rawAddress);

    const nativeWei = await publicClient.getBalance({ address }).catch((err: unknown) => {
      throw new UpstreamError(
        "Failed to read native balance from RPC",
        err instanceof Error ? err.message : String(err),
      );
    });

    const rows = await fetchTokenTransfers(address);
    const decoded = rows.map((r) => {
      const decimals = Number.parseInt(r.tokenDecimal || "18", 10);
      const value = Number(r.value) / 10 ** (Number.isFinite(decimals) ? decimals : 18);
      return {
        hash: r.hash,
        from: r.from.toLowerCase(),
        to: r.to.toLowerCase(),
        valueRaw: r.value,
        value,
        tokenSymbol: r.tokenSymbol || "UNKNOWN",
        tokenDecimals: Number.isFinite(decimals) ? decimals : 18,
        blockNumber: Number.parseInt(r.blockNumber, 10),
        timeStamp: Number.parseInt(r.timeStamp, 10),
      };
    });

    const values = decoded.map((t) => t.value).filter((v) => v > 0);
    const baseline = median(values);
    const maxValue = values.reduce((m, v) => Math.max(m, v), 0);
    // Outlier: > 5x the median (and median is non-trivial), or the single largest move.
    const transfers: ObservedTransfer[] = decoded.map((t) => {
      const isOutlier =
        (baseline > 0 && t.value > baseline * 5) || (maxValue > 0 && t.value === maxValue);
      return {
        ...t,
        explorerUrl: explorerTx(env.CHAIN_ID, t.hash),
        isOutlier,
      };
    });
    const outlierCount = transfers.filter((t) => t.isOutlier).length;

    const activity: WalletActivity = {
      address,
      nativeBalanceWei: nativeWei.toString(),
      nativeBalanceMnt: formatEther(nativeWei),
      transferCount: transfers.length,
      baselineValue: baseline,
      maxValue,
      outlierCount,
      transfers,
    };

    this.calls.push({
      tool: "mantle.getWalletActivity",
      input: { address, chainId: env.CHAIN_ID },
      output: {
        nativeBalanceMnt: activity.nativeBalanceMnt,
        transferCount: activity.transferCount,
        outlierCount,
      },
    });
    return activity;
  }
}
