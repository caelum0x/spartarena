/** Sleep for `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return true to retry the given error; default retries everything. */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Runs `fn` with exponential backoff. Used for rate-limited / range-limited
 * external calls (Etherscan free tier, RPC getLogs). Immutable, no shared state.
 */
export async function withBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !shouldRetry(error)) {
        break;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Heuristic: is this error a transient rate-limit / range error worth retrying? */
export function isTransient(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("range") ||
    message.includes("too many") ||
    message.includes("503") ||
    message.includes("502")
  );
}
