import type { ToolCall } from "../tools/mantle.js";

/**
 * The canonical result shape every Spartan agent returns. It bundles the exact
 * prompt sent to the LLM, the recorded tool calls, and the validated output so
 * the downstream pipeline (hashing -> proof -> on-chain write) can operate on a
 * single uniform structure regardless of which agent produced it.
 *
 * Generic over `T`, the agent's validated output type (e.g. AlphaSentinelOutput,
 * YieldStrategistOutput).
 */
export interface AgentRun<T> {
  prompt: { system: string; user: string };
  toolCalls: ToolCall[];
  output: T;
}

/**
 * Contract every Spartan agent conforms to. `TInput` is the agent's typed input
 * and `TOutput` its validated output. Keeping this interface tiny and explicit
 * lets the runner treat agents interchangeably while preserving full type safety
 * at each call site.
 */
export interface BaseAgent<TInput, TOutput> {
  run(input: TInput): Promise<AgentRun<TOutput>>;
}
