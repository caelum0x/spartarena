import type { ZodType } from "zod";

/**
 * Extracts the first balanced JSON object from a model response. LLMs sometimes
 * wrap JSON in prose or ```json fences despite instructions; this recovers the
 * object without trusting the model to be perfectly clean.
 */
export function extractJsonObject(text: string): string {
  const trimmed = text.trim();

  // Strip a leading/trailing markdown code fence if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = fenced?.[1] ?? trimmed;

  const start = body.indexOf("{");
  if (start === -1) {
    return body;
  }

  // Walk the string tracking brace depth, ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < body.length; i += 1) {
    const ch = body[i]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return body.slice(start, i + 1);
      }
    }
  }
  return body.slice(start);
}

/**
 * Parses `text` as JSON and validates it against `schema`. Throws a descriptive
 * error (including a snippet of the offending text) on failure so the retry path
 * can surface useful context.
 */
export function parseAndValidate<T>(text: string, schema: ZodType<T>): T {
  const json = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM returned non-JSON output (${reason}): ${snippet(text)}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `LLM JSON failed schema validation: ${result.error.message}. Output: ${snippet(text)}`,
    );
  }
  return result.data;
}

function snippet(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 300 ? `${clean.slice(0, 300)}…` : clean;
}

/** Standard nudge appended to the user prompt on a JSON retry. */
export const JSON_RETRY_NUDGE =
  "\n\nIMPORTANT: Your previous response could not be parsed. Reply with ONLY a single " +
  "valid JSON object that matches the requested schema. No prose, no markdown, no code fences.";

/** Standard JSON-only instruction appended to system prompts for structured calls. */
export const JSON_ONLY_INSTRUCTION =
  "\n\nReturn ONLY a single valid JSON object matching the requested schema. " +
  "Do not include prose, explanations, or markdown code fences outside the JSON.";
