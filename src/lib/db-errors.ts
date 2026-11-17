// ─── Database error classification ───────────────────────────────────────────

/**
 * SQLSTATE for a unique-constraint violation. Prisma 8 puts the driver's code on
 * `SqlQueryError.sqlState` (Prisma 7 called this P2002).
 */
const UNIQUE_VIOLATION_SQLSTATE = "23505";

/** How many `cause` links to follow, in case middleware wrapped the driver error. */
const MAX_CAUSE_DEPTH = 5;

/**
 * True when a write failed because a `@unique` column already holds that value.
 * Use it to turn the race between "check, then insert" into a 409 instead of a 500.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) return false;
    if ((current as { sqlState?: unknown }).sqlState === UNIQUE_VIOLATION_SQLSTATE) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
