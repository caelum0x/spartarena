import type { z } from "zod";
import { ValidationError } from "./errors.js";

/**
 * Parse unknown input against a zod schema, raising a {@link ValidationError}
 * (HTTP 400) with structured field details on failure. Centralising this keeps
 * every route's input handling consistent and prevents zod errors leaking out
 * as 500s.
 *
 * Generic over the schema type so the return type is the schema's *output*
 * (defaults applied → required), not its input.
 */
export function parse<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Request validation failed", result.error.flatten());
  }
  return result.data;
}
