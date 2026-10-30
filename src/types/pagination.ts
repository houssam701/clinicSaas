import { z } from "../lib/zod";

// ─── Shared pagination contract (API query params + repository results) ──────

export const DEFAULT_PAGE_SIZE = 2;
export const MAX_PAGE_SIZE = 200;

/** `?page=&limit=` for any list endpoint. Extend it with the endpoint's own filters. */
export const PaginationQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationInput = z.infer<typeof PaginationQuerySchema>;

/** What a repository returns for one page: the rows plus the total matching count. */
export type PaginatedResult<T> = { data: T[]; total: number };

/** Rows to skip for a 1-based page. */
export function pageOffset({ page, limit }: PaginationInput): number {
  return (page - 1) * limit;
}
