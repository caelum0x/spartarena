import { z } from "zod";
import type { ApiMeta } from "./errors.js";

/**
 * Cursor-free, offset/limit pagination helpers.
 *
 * Query parameters arrive as strings; {@link PaginationQuerySchema} coerces and
 * bounds them so a malicious `limit=1e9` can never hit the database. Services
 * translate the parsed values to Prisma `skip`/`take` and build the response
 * {@link ApiMeta} via {@link buildMeta}.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginationArgs {
  readonly page: number;
  readonly limit: number;
  readonly skip: number;
  readonly take: number;
}

/** Normalise a parsed pagination query into Prisma-ready skip/take. */
export function toPaginationArgs(query: PaginationQuery): PaginationArgs {
  const page = Math.max(1, query.page);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Build response pagination metadata from a total count. */
export function buildMeta(total: number, args: PaginationArgs): ApiMeta {
  return {
    total,
    page: args.page,
    limit: args.limit,
    totalPages: args.limit > 0 ? Math.ceil(total / args.limit) : 0,
  };
}
