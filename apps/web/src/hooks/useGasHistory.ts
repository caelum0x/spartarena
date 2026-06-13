"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, formatGwei } from "viem";
import { getChainById, mantleSepolia } from "@spartarena/sdk";
import { env } from "@/config/env";

/**
 * Live, in-session Mantle gas-price history.
 *
 * Reads the REAL Mantle chain over its public JSON-RPC endpoint (no mock data),
 * polling `getGasPrice()` on a fixed interval and keeping a capped, in-memory
 * series of GWEI readings for the current session only (resets on reload).
 *
 * A single module-level viem public client is shared across renders so we don't
 * spin up a new transport on every mount.
 */

const client = createPublicClient({
  chain: getChainById(env.chainId) ?? mantleSepolia,
  transport: http(env.rpcUrl),
});

/** How often we poll the RPC for a fresh gas price. */
const POLL_INTERVAL_MS = 10_000;

/** Maximum number of readings retained in the in-session series. */
const MAX_POINTS = 60;

export interface GasHistory {
  /** In-session gas-price readings, in GWEI, oldest first (max 60). */
  readonly history: number[];
  /** Most recent reading in GWEI, or null before the first reading lands. */
  readonly current: number | null;
  /** Lowest reading this session (0 when empty). */
  readonly min: number;
  /** Highest reading this session (0 when empty). */
  readonly max: number;
  /** Mean of all readings this session (0 when empty). */
  readonly avg: number;
  /** False until the first reading has been recorded. */
  readonly ready: boolean;
  /** True if the most recent poll threw (prior history is preserved). */
  readonly error: boolean;
}

/**
 * Poll the real Mantle RPC for gas price and build an in-session GWEI series.
 *
 * Polls immediately on mount and then every {@link POLL_INTERVAL_MS}. History is
 * held in memory only and is capped to the most recent {@link MAX_POINTS} points.
 */
export function useGasHistory(): GasHistory {
  const [history, setHistory] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const wei = await client.getGasPrice();
        if (cancelled) return;
        const gwei = Number(formatGwei(wei));
        // Immutable update: append and keep only the most recent MAX_POINTS.
        setHistory((prev) => [...prev, gwei].slice(-MAX_POINTS));
        setReady(true);
        setError(false);
      } catch {
        if (cancelled) return;
        // Keep prior history; just flag the failed poll.
        setError(true);
      }
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const count = history.length;
  const current = count > 0 ? history[count - 1]! : null;
  const min = count > 0 ? Math.min(...history) : 0;
  const max = count > 0 ? Math.max(...history) : 0;
  const avg = count > 0 ? history.reduce((sum, v) => sum + v, 0) / count : 0;

  return { history, current, min, max, avg, ready, error };
}
