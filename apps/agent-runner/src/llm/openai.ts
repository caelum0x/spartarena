import { z, type ZodType } from "zod";
import type { LlmProvider } from "./provider.js";
import { DEFAULT_LLM_TIMEOUT_MS } from "./provider.js";
import { postJson } from "./http.js";
import {
  JSON_ONLY_INSTRUCTION,
  JSON_RETRY_NUDGE,
  parseAndValidate,
} from "./json.js";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

/** Build the chat-completions endpoint, honouring an OpenAI-compatible base URL. */
function chatCompletionsUrl(): string {
  const base = (process.env.OPENAI_BASE_URL ?? OPENAI_DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

/** Response shape we depend on: `choices[0].message.content`. */
const OpenAiResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
});

/**
 * Real OpenAI Chat Completions provider. Uses native fetch with an
 * AbortController timeout. For structured output it sets
 * `response_format: { type: "json_object" }`.
 */
export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.apiKey = apiKey;
    this.model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    this.temperature = Number(process.env.LLM_TEMPERATURE ?? 0.2);
    this.timeoutMs = DEFAULT_LLM_TIMEOUT_MS;
  }

  async complete(system: string, user: string): Promise<string> {
    return this.chat(system, user, false);
  }

  async completeJson<T>(system: string, user: string, schema: ZodType<T>): Promise<T> {
    // `json_object` mode requires the word "json" in the prompt; the appended
    // instruction guarantees it.
    const jsonSystem = `${system}${JSON_ONLY_INSTRUCTION}`;
    try {
      const first = await this.chat(jsonSystem, user, true);
      return parseAndValidate(first, schema);
    } catch {
      const retry = await this.chat(jsonSystem, `${user}${JSON_RETRY_NUDGE}`, true);
      return parseAndValidate(retry, schema);
    }
  }

  private async chat(system: string, user: string, json: boolean): Promise<string> {
    const raw = await postJson({
      url: chatCompletionsUrl(),
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: {
        model: this.model,
        temperature: this.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      },
      timeoutMs: this.timeoutMs,
    });
    return extractContent(raw);
  }
}

function extractContent(raw: unknown): string {
  const parsed = OpenAiResponseSchema.parse(raw);
  const content = parsed.choices[0]?.message.content?.trim();
  if (!content) {
    throw new Error("OpenAI response contained no message content");
  }
  return content;
}
