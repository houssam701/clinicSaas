import { AuthAttemptRepository } from "../repository/auth-attempt-repository";
import { ATTEMPT_RETENTION_HOURS, type AttemptLimit } from "../config/auth-limits";

/**
 * Whether `key` is blocked: `max` failures within `windowMinutes` of each
 * other, the last one less than `windowMinutes` ago. Returns how many
 * seconds remain, or 0 when the action may go ahead.
 */
export async function secondsUntilAllowed(key: string, limit: AttemptLimit, now = Date.now()): Promise<number> {
  const recent = await AuthAttemptRepository.latest(key, limit.max);
  if (recent.length < limit.max) return 0;

  const windowMs = limit.windowMinutes * 60_000;
  const newest = Date.parse(recent[0]);
  const oldest = Date.parse(recent[recent.length - 1]);
  if (newest - oldest > windowMs) return 0; // failures too spread out to count together

  const remaining = newest + windowMs - now;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Records one failure for `key`, and prunes failures past their retention. */
export async function recordFailure(key: string): Promise<void> {
  await AuthAttemptRepository.add(key);
  await AuthAttemptRepository.prune(new Date(Date.now() - ATTEMPT_RETENTION_HOURS * 3_600_000).toISOString());
}

/** After a success: the earlier failures no longer count. */
export function clearFailures(key: string): Promise<void> {
  return AuthAttemptRepository.clear(key);
}

/** "15 minutes" / "1 minute" for a wait in seconds (rounded up). */
export function describeWait(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
