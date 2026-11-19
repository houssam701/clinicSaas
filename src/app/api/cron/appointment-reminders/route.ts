import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/services/appointment-reminders";

/** Shorter secrets are refused: the job must not be guessable. */
const MIN_SECRET_LENGTH = 32;

/** Constant-time comparison (hashing first makes the lengths equal). */
function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * GET /api/cron/appointment-reminders
 *
 * Sends the appointment reminders that are due (see sendDueReminders). Meant
 * for a scheduler (Vercel Cron, a server cron, GitHub Actions, cron-job.org…)
 * every 15 minutes; safe to call more often or twice at once.
 *
 * Auth:   Authorization: Bearer <CRON_SECRET>  (not a user session)
 *
 * Responses:
 *   200  { due, sent, failedPermanently, retryLater, skipped }  (counts only, no patient data)
 *   401  Missing or wrong secret
 *   503  CRON_SECRET not set (or shorter than 32 characters): the job is off
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    return NextResponse.json({ error: "Reminders are not configured (CRON_SECRET)." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!given || !sameSecret(given, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
}
