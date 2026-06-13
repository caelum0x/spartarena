"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/config/env";
import { DecisionViewSchema } from "@/lib/schemas";
import type { DecisionView } from "@/types";
import { useDecisions } from "./useDecisions";

export interface ChronicleStream {
  /** Decisions newest-first; live SSE entries prepended ahead of the seed list. */
  readonly decisions: readonly DecisionView[];
  /** Decision ids that arrived live this session, for a subtle highlight. */
  readonly liveIds: ReadonlySet<number>;
  readonly isLoading: boolean;
  /** True once a backend SSE connection is open; false when polling. */
  readonly isLive: boolean;
}

const STREAM_PATH = "/chronicle/stream";
const MAX_DECISIONS = 200;

/** Parse one SSE payload into a validated DecisionView, or null when malformed. */
function parseEvent(raw: string): DecisionView | null {
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = DecisionViewSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Live War Chronicle.
 *
 * Seeds from the existing `GET /decisions` query (which itself honours mocks and
 * polling), then subscribes to the backend SSE stream `GET /chronicle/stream` via
 * EventSource, prepending newly recorded decisions live and flagging them so the
 * UI can highlight them. Gracefully degrades to the seed query's polling when
 * EventSource is unavailable, errors, or mocks are enabled.
 */
export function useChronicleStream(): ChronicleStream {
  const seed = useDecisions();
  const seedDecisions = useMemo(() => seed.data?.data ?? [], [seed.data]);

  const [liveDecisions, setLiveDecisions] = useState<readonly DecisionView[]>([]);
  const [liveIds, setLiveIds] = useState<ReadonlySet<number>>(() => new Set());
  const [isLive, setIsLive] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());

  // EventSource only works in the browser; skip entirely on the mock path.
  const useSse =
    !env.useMocks && typeof window !== "undefined" && typeof EventSource !== "undefined";

  useEffect(() => {
    if (!useSse) {
      setIsLive(false);
      return;
    }

    let source: EventSource;
    try {
      source = new EventSource(`${env.apiUrl}${STREAM_PATH}`);
    } catch {
      setIsLive(false);
      return;
    }

    const onOpen = () => setIsLive(true);

    const onMessage = (event: MessageEvent<string>) => {
      const decision = parseEvent(event.data);
      if (!decision || seenIds.current.has(decision.decisionId)) return;
      seenIds.current.add(decision.decisionId);
      setLiveDecisions((prev) => [decision, ...prev].slice(0, MAX_DECISIONS));
      setLiveIds((prev) => {
        const next = new Set(prev);
        next.add(decision.decisionId);
        return next;
      });
    };

    const onError = () => {
      // Network/parse failure: fall back to the seed query's polling.
      setIsLive(false);
    };

    source.addEventListener("open", onOpen);
    source.addEventListener("message", onMessage);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("open", onOpen);
      source.removeEventListener("message", onMessage);
      source.removeEventListener("error", onError);
      source.close();
    };
  }, [useSse]);

  // Merge live entries ahead of the seed list, de-duplicating by decisionId.
  const decisions = useMemo(() => {
    const liveIdSet = new Set(liveDecisions.map((d) => d.decisionId));
    const rest = seedDecisions.filter((d) => !liveIdSet.has(d.decisionId));
    return [...liveDecisions, ...rest].slice(0, MAX_DECISIONS);
  }, [liveDecisions, seedDecisions]);

  return {
    decisions,
    liveIds,
    isLoading: seed.isLoading,
    isLive,
  };
}
