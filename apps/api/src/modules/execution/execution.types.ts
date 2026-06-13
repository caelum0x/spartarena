import type { AgentOutput } from "@spartarena/shared";
import type { DecisionHashes } from "../../lib/hash.js";

/**
 * Shared types for the execution module.
 *
 * An execution run produces a deterministic structured decision, its three
 * committed hashes, scoring, and — when chain writes are enabled — the on-chain
 * transaction hash and assigned decision id.
 */

/** Which built-in Spartan persona to run. */
export type AgentKind = "AlphaSentinel" | "YieldStrategist";

/** The prompt object that is hashed into `promptHash`. */
export interface ExecutionPrompt {
  readonly taskId: number;
  readonly agentKind: AgentKind;
  readonly description: string;
}

/** A single tool invocation recorded for the `toolsHash` commitment. */
export interface ToolCall {
  readonly tool: string;
  readonly input: unknown;
  readonly output: unknown;
}

/** Outcome of a single execution run. */
export interface ExecutionResult {
  readonly taskId: number;
  readonly agentKind: AgentKind;
  readonly output: AgentOutput;
  readonly hashes: DecisionHashes;
  readonly toolCalls: readonly ToolCall[];
  readonly confidence: number;
  readonly riskScore: number;
  readonly actionType: string;
  readonly latencyMs: number;
  /** Decision row id in Postgres (always set). */
  readonly decisionId: string;
  /** On-chain decision id once recorded, else null. */
  readonly chainDecisionId: number | null;
  /** DecisionLedger tx hash, or null when chain writes are disabled. */
  readonly decisionTxHash: string | null;
  /** TaskEscrow.submitResult tx hash, or null. */
  readonly resultTxHash: string | null;
  /** Whether the proof was committed to Mantle. */
  readonly onChain: boolean;
}
