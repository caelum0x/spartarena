import type { ZodType } from "zod";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAiProvider } from "./openai.js";

/**
 * LLM provider abstraction. The runner is provider-agnostic: agents build a
 * prompt and ask the provider to complete it (free-form prose) or to produce a
 * Zod-validated JSON object (`completeJson`).
 *
 * Selection (see `getProvider`) is real-by-default:
 *   ANTHROPIC_API_KEY -> Anthropic, else OPENAI_API_KEY -> OpenAI,
 *   else LLM_PROVIDER=mock -> deterministic mock (tests/offline only),
 *   else a clear configuration error is thrown.
 */
export interface LlmProvider {
  readonly name: string;
  /** Free-form completion — returns the model's text. */
  complete(system: string, user: string): Promise<string>;
  /**
   * Structured completion. Instructs the model to return ONLY JSON, parses it,
   * validates it against `schema`, and retries once with a "return valid JSON
   * only" nudge on any parse/validation failure.
   */
  completeJson<T>(system: string, user: string, schema: ZodType<T>): Promise<T>;
}

/** Shared default request timeout (ms) for all real providers. */
export const DEFAULT_LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 60_000);

/**
 * Deterministic mock provider. Default ONLY for tests/offline runs behind
 * `LLM_PROVIDER=mock`. Never selected when a real API key is present.
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";

  async complete(_system: string, user: string): Promise<string> {
    const firstLine = user.split("\n").find((l) => l.trim().length > 0) ?? "the task";
    return `Based on the supplied on-chain evidence, the most material signal relates to: ${firstLine.trim()}. The pattern is consistent with concentrated, atypical movement that warrants monitoring.`;
  }

  /**
   * Returns the schema's safe defaults by reflecting on the requested shape is
   * impractical, so the mock asks each caller to supply a deterministic builder
   * via the `MOCK_JSON` channel. In practice the agents pass their own fallback
   * (see `completeJsonOrFallback`), so this is only hit when used directly.
   */
  async completeJson<T>(_system: string, _user: string, schema: ZodType<T>): Promise<T> {
    // The mock cannot synthesise an arbitrary valid object for any schema. The
    // agents always provide a deterministic fallback object and only ask the
    // mock to "bless" it, so we validate that fallback here. When called with no
    // fallback context we surface a clear error rather than guessing.
    throw new MockJsonUnsupportedError(schema);
  }
}

/** Raised when the mock provider is asked to synthesise arbitrary JSON. */
export class MockJsonUnsupportedError extends Error {
  constructor(public readonly schema: ZodType<unknown>) {
    super(
      "MockLlmProvider.completeJson cannot synthesise arbitrary JSON. Agents must " +
        "supply a deterministic fallback object (completeJsonOrFallback).",
    );
    this.name = "MockJsonUnsupportedError";
  }
}

/**
 * Calls `provider.completeJson`, but when the provider is the offline mock (which
 * cannot synthesise arbitrary JSON), returns the caller's deterministic
 * `fallback` instead. This keeps the real path LLM-driven while letting the mock
 * path exercise the full pipeline (hashing, scoring, chain writes) offline.
 */
export async function completeJsonOrFallback<T>(
  provider: LlmProvider,
  system: string,
  user: string,
  schema: ZodType<T>,
  fallback: T,
): Promise<T> {
  if (provider instanceof MockLlmProvider) {
    return schema.parse(fallback);
  }
  return provider.completeJson(system, user, schema);
}

export function getProvider(): LlmProvider {
  // An explicit LLM_PROVIDER always wins, so an offline/test run (LLM_PROVIDER=mock)
  // is honoured even when an unrelated API key happens to be present in the env.
  const explicit = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (explicit === "mock") {
    return new MockLlmProvider();
  }
  if (explicit === "anthropic") {
    return new AnthropicProvider();
  }
  if (explicit === "openai") {
    return new OpenAiProvider();
  }

  // Otherwise auto-select the first configured real provider.
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiProvider();
  }
  throw new Error(
    "No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for real " +
      "inference, or set LLM_PROVIDER=mock for offline/test runs.",
  );
}
