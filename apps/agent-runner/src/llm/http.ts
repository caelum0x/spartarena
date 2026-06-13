/**
 * Minimal HTTP helper for LLM providers: native fetch with an AbortController
 * timeout. Network/transport concerns live here so the providers stay focused on
 * request shaping and response parsing.
 */
export interface PostJsonOptions {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
}

export async function postJson(options: PostJsonOptions): Promise<unknown> {
  const { url, headers, body, timeoutMs } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${truncate(text)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Expected JSON response but got: ${truncate(text)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function truncate(text: string): string {
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}
