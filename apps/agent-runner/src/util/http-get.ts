import { withBackoff, isTransient } from "./retry.js";

/**
 * Shared GET helper: native fetch + AbortController timeout + exponential
 * backoff on transient (429/5xx/timeout) errors. Returns parsed JSON.
 */
export async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 20_000,
): Promise<unknown> {
  return withBackoff(() => fetchJsonOnce(url, headers, timeoutMs), {
    shouldRetry: isTransient,
  });
}

async function fetchJsonOnce(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Expected JSON from ${url} but got: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`GET ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
