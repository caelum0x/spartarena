import { parseAbi, type Abi, type AbiEvent } from "viem";
import {
  agentRegistryAbi,
  taskEscrowAbi,
  decisionLedgerAbi,
  agentStakingAbi,
} from "@spartarena/sdk";
import { env, hasContractAddresses } from "../../env.js";
import { childLogger } from "../../lib/logger.js";
import { publicClient } from "../../chain/publicClient.js";
import { getReadClient } from "../../chain/client.js";
import { cursorRepository } from "./cursor.repository.js";
import { handleLog, type DecodedLog } from "./event-handlers.js";

/**
 * Chain event poller.
 *
 * Periodically scans new blocks for the contracts we mirror (AgentRegistry,
 * TaskEscrow, DecisionLedger), decodes their event logs via viem, and dispatches
 * each to the idempotent handlers. The cursor is advanced only after a batch is
 * fully processed so a crash mid-batch re-scans rather than skips. Disabled when
 * addresses are unset or `INDEXER_POLL_INTERVAL_MS` is 0.
 */
const log = childLogger("indexer");

/** Extract just the event fragments from a const ABI as a mutable Abi. */
function eventsOf(abi: readonly unknown[]): AbiEvent[] {
  return (abi as Abi).filter((item): item is AbiEvent => item.type === "event");
}

interface ContractTarget {
  readonly name: string;
  readonly address: `0x${string}`;
  readonly events: AbiEvent[];
}

function resolveTargets(): ContractTarget[] {
  if (!hasContractAddresses(env)) return [];
  const client = getReadClient();
  if (!client) return [];
  return [
    {
      name: "AgentRegistry",
      address: client.addresses.AgentRegistry,
      events: eventsOf(agentRegistryAbi),
    },
    {
      name: "TaskEscrow",
      address: client.addresses.TaskEscrow,
      events: eventsOf(taskEscrowAbi),
    },
    {
      name: "DecisionLedger",
      address: client.addresses.DecisionLedger,
      events: eventsOf(decisionLedgerAbi),
    },
    {
      name: "AgentStaking",
      address: client.addresses.AgentStaking,
      events: eventsOf(agentStakingAbi),
    },
  ];
}

export class IndexerService {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private stopped = false;

  /** Whether the poller can run with the current configuration. */
  public get enabled(): boolean {
    return env.INDEXER_POLL_INTERVAL_MS > 0 && hasContractAddresses(env);
  }

  /** Start the polling loop. Safe to call when disabled (becomes a no-op). */
  public start(): void {
    if (!this.enabled) {
      log.info("Indexer disabled (no addresses or interval=0)");
      return;
    }
    this.stopped = false;
    const tick = async (): Promise<void> => {
      if (this.stopped) return;
      await this.pollOnce().catch((err) => log.error({ err }, "Poll tick failed"));
      if (!this.stopped) {
        this.timer = setTimeout(() => void tick(), env.INDEXER_POLL_INTERVAL_MS);
      }
    };
    log.info({ intervalMs: env.INDEXER_POLL_INTERVAL_MS }, "Indexer started");
    void tick();
  }

  /** Stop the polling loop. */
  public stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Scan a single block range. Guards against overlapping runs and bounds the
   * batch size so a long offline period catches up over several ticks.
   */
  public async pollOnce(): Promise<{ from: bigint; to: bigint; logs: number }> {
    if (this.running) return { from: 0n, to: 0n, logs: 0 };
    this.running = true;
    try {
      const targets = resolveTargets();
      if (targets.length === 0) return { from: 0n, to: 0n, logs: 0 };

      const head = await publicClient.getBlockNumber();
      const stored = await cursorRepository.get(env.CHAIN_ID);
      const from = stored !== null ? stored + 1n : maxStart(head);
      if (from > head) return { from, to: head, logs: 0 };

      const batch = BigInt(env.INDEXER_BLOCK_BATCH_SIZE);
      const to = from + batch - 1n > head ? head : from + batch - 1n;

      let processed = 0;
      for (const target of targets) {
        const logs = await getLogsChunked(target, from, to);
        for (const l of logs) {
          await handleLog(target.name, l);
          processed++;
        }
      }

      await cursorRepository.set(env.CHAIN_ID, to);
      if (processed > 0) {
        log.info({ from: from.toString(), to: to.toString(), processed }, "Indexed events");
      }
      return { from, to, logs: processed };
    } finally {
      this.running = false;
    }
  }
}

/** Where to begin a fresh scan: recent history only, not genesis. */
function maxStart(head: bigint): bigint {
  const lookback = 50_000n;
  return head > lookback ? head - lookback : 0n;
}

const MAX_GETLOGS_DEPTH = 6;

function isRetryableRpcError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes("range") ||
    message.includes("too large") ||
    message.includes("limit") ||
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("-32005")
  );
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch logs for a single contract across [from, to], splitting the range in
 * half (recursively) and backing off when the RPC rejects an over-wide range or
 * rate-limits us. Bounds recursion depth so a persistently failing call surfaces
 * the error instead of looping forever.
 */
async function getLogsChunked(
  target: ContractTarget,
  from: bigint,
  to: bigint,
  depth = 0,
): Promise<DecodedLog[]> {
  try {
    const logs = await publicClient.getLogs({
      address: target.address,
      events: target.events,
      fromBlock: from,
      toBlock: to,
    });
    return logs as DecodedLog[];
  } catch (err) {
    if (from >= to || depth >= MAX_GETLOGS_DEPTH || !isRetryableRpcError(err)) {
      throw err;
    }
    log.warn(
      { err, from: from.toString(), to: to.toString(), depth },
      "getLogs failed; splitting range and backing off",
    );
    await sleep(250 * (depth + 1));
    const mid = from + (to - from) / 2n;
    const left = await getLogsChunked(target, from, mid, depth + 1);
    const right = await getLogsChunked(target, mid + 1n, to, depth + 1);
    return [...left, ...right];
  }
}

export const indexerService = new IndexerService();

/** Touch parseAbi so the import stays available for ad-hoc ABI parsing. */
export const _parseAbi = parseAbi;
