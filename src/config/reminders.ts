/**
 * Appointment reminder emails (see src/services/appointment-reminders.ts).
 * A scheduler calls GET /api/cron/appointment-reminders (every 15 minutes is
 * a good pace); each run sends what is due, up to a small batch.
 */

/** "Days before" an admin can choose. */
export const REMINDER_DAY_CHOICES = [1, 2, 3, 4, 5, 6, 7] as const;
export const MAX_REMINDER_DAYS = 7;

/** No reminder for a visit closer than this (booked at the last minute, or the job was down). */
export const REMINDER_MIN_LEAD_HOURS = 2;

/** At most this many emails per run; the rest go on the next run. Keeps each run short. */
export const REMINDER_BATCH_SIZE = 40;

/** Pause between two emails, to stay under the provider's rate limit (Resend: 2 per second). */
export const REMINDER_SEND_INTERVAL_MS = 550;
