import { z } from "zod";
import { env, resolveLlmProvider, type LlmSelection } from "../env.js";
import { childLogger } from "../lib/logger.js";
import { ServiceUnavailableError, UpstreamError } from "../lib/errors.js";

/**
 * Real LLM provider abstraction for the execution pipeline.
 *
 * The default code path hits a real provider: Anthropic Messages API when
 * `ANTHROPIC_API_KEY` is set, else OpenAI Chat Completions when `OPENAI_API_KEY`
 * is set. A deterministic offline provider is available ONLY behind
 * `LLM_PROVIDER=mock` (tests/demo without keys). All HTTP calls use native fetch
 * with an AbortController timeout and a single bounded retry on transient errors.
 *
 * `complete()` returns free-form narration; `completeJson()` instructs the model
 * to return JSON only and validates it against a zod schema, retrying once with a
 * stricter nudge on parse failure.
 */
const log = childLogger("llm");

export interface LlmProvider {
  readonly name: LlmSelection;
  readonly model: string;
  /** Free-form completion (e.g. human explanation prose). */
  complete(system: string, user: string): Promise<string>;
  /** Structured completion validated against a zod schema. */
  completeJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T>;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);

/** Sleep helper for backoff between retries. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** POST JSON with a hard timeout via AbortController; one retry on transient failure. */
async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (RETRYABLE_STATUS.has(res.status) && attempt === 0) {
          lastErr = new UpstreamError(`LLM HTTP ${res.status}`);
          await delay(400 * (attempt + 1));
          continue;
        }
        throw new UpstreamError(`LLM request failed (${res.status})`, text.slice(0, 200));
      }
      return (await res.json()) as unknown;
    } catch (err) {
      lastErr = err;
      const transient =
        err instanceof Error && (err.name === "AbortError" || err.name === "TypeError");
      if (transient && attempt === 0) {
        await delay(400 * (attempt + 1));
        continue;
      }
      if (err instanceof UpstreamError) throw err;
      throw new UpstreamError("LLM request error", err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new UpstreamError("LLM request failed");
}

/** Extract the first balanced JSON object/array from a model response. */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1]! : trimmed).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate;
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1);
    }
  }
  return candidate.slice(start);
}

const AnthropicResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })).min(1),
});

const OpenAiResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
    .min(1),
});

/** Anthropic Messages API provider (default when ANTHROPIC_API_KEY is set). */
class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  readonly model = env.ANTHROPIC_MODEL;

  private async call(system: string, user: string, jsonMode: boolean): Promise<string> {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (apiKey === undefined) {
      throw new ServiceUnavailableError("ANTHROPIC_API_KEY is not configured");
    }
    const systemPrompt = jsonMode
      ? `${system}\n\nRespond with ONLY a single valid JSON value. No prose, no markdown fences.`
      : system;
    const raw = await postJson(
      ANTHROPIC_URL,
      { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      {
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: user }],
      },
      env.LLM_TIMEOUT_MS,
    );
    const parsed = AnthropicResponseSchema.parse(raw);
    const text = parsed.content.find((b) => b.type === "text")?.text;
    if (text === undefined) throw new UpstreamError("Anthropic returned no text content");
    return text;
  }

  complete(system: string, user: string): Promise<string> {
    return this.call(system, user, false);
  }

  completeJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
    return completeJsonWith((s, u) => this.call(s, u, true), system, user, schema);
  }
}

/** OpenAI Chat Completions provider (fallback when only OPENAI_API_KEY is set). */
class OpenAiProvider implements LlmProvider {
  readonly name = "openai" as const;
  readonly model = env.OPENAI_MODEL;

  private async call(system: string, user: string, jsonMode: boolean): Promise<string> {
    const apiKey = env.OPENAI_API_KEY;
    if (apiKey === undefined) {
      throw new ServiceUnavailableError("OPENAI_API_KEY is not configured");
    }
    const raw = await postJson(
      OPENAI_URL,
      { authorization: `Bearer ${apiKey}` },
      {
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      },
      env.LLM_TIMEOUT_MS,
    );
    const parsed = OpenAiResponseSchema.parse(raw);
    const text = parsed.choices[0]?.message.content;
    if (text === null || text === undefined) {
      throw new UpstreamError("OpenAI returned no message content");
    }
    return text;
  }

  complete(system: string, user: string): Promise<string> {
    return this.call(system, user, false);
  }

  completeJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
    return completeJsonWith((s, u) => this.call(s, u, true), system, user, schema);
  }
}

/**
 * Deterministic offline provider. Only selected behind `LLM_PROVIDER=mock`. It
 * echoes a concise, reproducible "reasoning" string and returns schema-default
 * JSON so the pipeline runs end-to-end without any API keys (tests/demo).
 */
class MockLlmProvider implements LlmProvider {
  readonly name = "mock" as const;
  readonly model = "deterministic-v1";

  async complete(_system: string, user: string): Promise<string> {
    const firstLine = user.split("\n").find((l) => l.trim().length > 0) ?? "the task";
    return `Based on the supplied evidence, the most material signal relates to: ${firstLine.trim()}.`;
  }

  async completeJson<T>(_system: string, _user: string, schema: z.ZodType<T>): Promise<T> {
    // The mock provider cannot synthesise arbitrary structured output; callers
    // that need JSON must supply their own deterministic fallback.
    throw new ServiceUnavailableError(
      "Mock LLM provider does not support structured (JSON) completions",
    );
  }
}

/** Shared JSON-completion loop: parse + validate, retry once with a stricter nudge. */
async function completeJsonWith<T>(
  call: (system: string, user: string) => Promise<string>,
  system: string,
  user: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const text = await call(system, user);
  const first = schema.safeParse(safeJsonParse(extractJson(text)));
  if (first.success) return first.data;

  const retry = await call(
    system,
    `${user}\n\nYour previous reply was not valid JSON matching the required shape. Return ONLY valid JSON.`,
  );
  const second = schema.safeParse(safeJsonParse(extractJson(retry)));
  if (second.success) return second.data;
  throw new UpstreamError("LLM returned invalid JSON after retry", second.error.flatten());
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

let cached: LlmProvider | undefined;

/**
 * Resolve the active LLM provider. Throws a clear config error when no provider
 * is selected so the real path never silently falls back to fabricated data.
 */
export function getProvider(): LlmProvider {
  if (cached) return cached;
  const which = resolveLlmProvider();
  if (which === undefined) {
    throw new ServiceUnavailableError(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY (or LLM_PROVIDER=mock for offline demo).",
    );
  }
  cached =
    which === "anthropic"
      ? new AnthropicProvider()
      : which === "openai"
        ? new OpenAiProvider()
        : new MockLlmProvider();
  log.info({ provider: cached.name, model: cached.model }, "LLM provider selected");
  return cached;
}

/** Whether any LLM provider (real or mock) is configured. */
export function hasLlmProvider(): boolean {
  return resolveLlmProvider() !== undefined;
}
