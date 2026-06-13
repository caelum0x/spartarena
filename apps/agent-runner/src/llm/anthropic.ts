import { z, type ZodType } from "zod";
import type { LlmProvider } from "./provider.js";
import { DEFAULT_LLM_TIMEOUT_MS } from "./provider.js";
import { postJson } from "./http.js";
import {
  JSON_ONLY_INSTRUCTION,
  JSON_RETRY_NUDGE,
  parseAndValidate,
} from "./json.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-opus-4-8";
const DEFAULT_MAX_TOKENS = 2048;

/** Response shape we depend on: `content[0].text`. Validated with zod. */
const AnthropicResponseSchema = z.object({
  content: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .min(1),
});

/**
 * Real Anthropic Messages API provider. Uses native fetch with an
 * AbortController timeout; no SDK dependency. Model and timeout are env-driven.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.apiKey = apiKey;
    this.model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    this.maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS ?? DEFAULT_MAX_TOKENS);
    this.temperature = Number(process.env.LLM_TEMPERATURE ?? 0.2);
    this.timeoutMs = DEFAULT_LLM_TIMEOUT_MS;
  }

  async complete(system: string, user: string): Promise<string> {
    const raw = await postJson({
      url: ANTHROPIC_URL,
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: {
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system,
        messages: [{ role: "user", content: user }],
      },
      timeoutMs: this.timeoutMs,
    });
    return extractText(raw);
  }

  async completeJson<T>(system: string, user: string, schema: ZodType<T>): Promise<T> {
    const jsonSystem = `${system}${JSON_ONLY_INSTRUCTION}`;
    try {
      const first = await this.complete(jsonSystem, user);
      return parseAndValidate(first, schema);
    } catch {
      // Retry once with an explicit "valid JSON only" nudge.
      const retry = await this.complete(jsonSystem, `${user}${JSON_RETRY_NUDGE}`);
      return parseAndValidate(retry, schema);
    }
  }
}

function extractText(raw: unknown): string {
  const parsed = AnthropicResponseSchema.parse(raw);
  const text = parsed.content
    .map((block) => block.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Anthropic response contained no text content");
  }
  return text;
}
