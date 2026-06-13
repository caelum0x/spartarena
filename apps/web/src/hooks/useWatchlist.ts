"use client";

import { useCallback, useEffect, useState } from "react";

/** localStorage key under which the Byreal watchlist is persisted. */
const STORAGE_KEY = "spartarena:byreal:watchlist";

/** Persisted shape: watched Byreal pool addresses and token mints. */
export interface WatchlistState {
  readonly pools: string[];
  readonly tokens: string[];
}

const EMPTY: WatchlistState = { pools: [], tokens: [] };

/** Hook surface for reading and mutating the local Byreal watchlist. */
export interface UseWatchlist {
  readonly pools: string[];
  readonly tokens: string[];
  readonly isWatchedPool: (addr: string) => boolean;
  readonly isWatchedToken: (mint: string) => boolean;
  readonly togglePool: (addr: string) => void;
  readonly toggleToken: (mint: string) => void;
  readonly removePool: (addr: string) => void;
  readonly removeToken: (mint: string) => void;
  /** False until the persisted state has hydrated from localStorage. */
  readonly ready: boolean;
}

/** Narrows unknown parsed JSON into a safe WatchlistState (drops bad values). */
function normalize(value: unknown): WatchlistState {
  if (typeof value !== "object" || value === null) return EMPTY;
  const raw = value as Record<string, unknown>;
  const toStringArray = (input: unknown): string[] =>
    Array.isArray(input)
      ? Array.from(
          new Set(input.filter((v): v is string => typeof v === "string" && v.length > 0)),
        )
      : [];
  return {
    pools: toStringArray(raw.pools),
    tokens: toStringArray(raw.tokens),
  };
}

/** Toggles a string in/out of an array, returning a new array (immutable). */
function toggleIn(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Persists a personal Byreal watchlist of pool addresses and token mints in
 * `localStorage`. SSR-safe: state hydrates inside an effect (never during
 * render), and `ready` stays false until then so consumers can avoid hydration
 * mismatches. All updates are immutable and mirrored back to storage.
 */
export function useWatchlist(): UseWatchlist {
  const [state, setState] = useState<WatchlistState>(EMPTY);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once, on the client only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setState(normalize(JSON.parse(stored) as unknown));
      }
    } catch {
      // Corrupt/unavailable storage: fall back to the empty watchlist.
    } finally {
      setReady(true);
    }
  }, []);

  // Mirror state back to storage after hydration (avoid clobbering on mount).
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be full or disabled; the in-memory state still works.
    }
  }, [state, ready]);

  const togglePool = useCallback((addr: string) => {
    if (!addr) return;
    setState((prev) => ({ ...prev, pools: toggleIn(prev.pools, addr) }));
  }, []);

  const toggleToken = useCallback((mint: string) => {
    if (!mint) return;
    setState((prev) => ({ ...prev, tokens: toggleIn(prev.tokens, mint) }));
  }, []);

  const removePool = useCallback((addr: string) => {
    setState((prev) => ({ ...prev, pools: prev.pools.filter((v) => v !== addr) }));
  }, []);

  const removeToken = useCallback((mint: string) => {
    setState((prev) => ({ ...prev, tokens: prev.tokens.filter((v) => v !== mint) }));
  }, []);

  const isWatchedPool = useCallback((addr: string) => state.pools.includes(addr), [state.pools]);
  const isWatchedToken = useCallback((mint: string) => state.tokens.includes(mint), [state.tokens]);

  return {
    pools: state.pools,
    tokens: state.tokens,
    isWatchedPool,
    isWatchedToken,
    togglePool,
    toggleToken,
    removePool,
    removeToken,
    ready,
  };
}
