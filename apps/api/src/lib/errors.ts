/**
 * Typed application errors and the shared API response envelope.
 *
 * Every route returns `{ success, data, error, meta? }`. Domain code throws an
 * {@link AppError} subclass; the Fastify error handler (see server.ts) maps it
 * to the right HTTP status and envelope, so handlers never build error shapes
 * by hand and never leak stack traces to clients.
 */

/** Standard success/error envelope returned by every endpoint. */
export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly meta?: ApiMeta;
}

/** Machine-readable error payload. */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  /** Optional field-level validation details. */
  readonly details?: unknown;
}

/** Pagination metadata for list endpoints. */
export interface ApiMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/** Build a success envelope. */
export function ok<T>(data: T, meta?: ApiMeta): ApiEnvelope<T> {
  return meta ? { success: true, data, error: null, meta } : { success: true, data, error: null };
}

/** Build an error envelope. */
export function fail(error: ApiError): ApiEnvelope<null> {
  return { success: false, data: null, error };
}

/** Base class for all expected (non-bug) application errors. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }

  public toApiError(): ApiError {
    return this.details !== undefined
      ? { code: this.code, message: this.message, details: this.details }
      : { code: this.code, message: this.message };
  }
}

/** 400 — the request was malformed or failed validation. */
export class ValidationError extends AppError {
  public constructor(message = "Validation failed", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  public constructor(resource = "Resource") {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}

/** 409 — the request conflicts with current state. */
export class ConflictError extends AppError {
  public constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

/** 503 — a required capability (e.g. chain signer) is not configured. */
export class ServiceUnavailableError extends AppError {
  public constructor(message = "Service unavailable") {
    super(503, "SERVICE_UNAVAILABLE", message);
  }
}

/** 502 — an upstream dependency (RPC, contract) failed. */
export class UpstreamError extends AppError {
  public constructor(message = "Upstream dependency failed", details?: unknown) {
    super(502, "UPSTREAM_ERROR", message, details);
  }

  /**
   * Never expose upstream details (raw LLM/Byreal/network error bodies) to API
   * callers — they can leak provider internals. `details` is retained on the
   * instance for server-side logging only.
   */
  public override toApiError(): ApiError {
    return { code: this.code, message: this.message };
  }
}
