import { NextRequest, NextResponse } from "next/server";
import { ReminderRepository } from "@/repository/reminder-repository";
import { isValidUnsubscribe } from "@/services/reminder-unsubscribe";

const NOT_FOUND = { error: "This link is not valid." };

/** The patient id and signature, from the query (links, one-click) or a JSON body. */
async function readLink(request: NextRequest): Promise<{ p: string; s: string }> {
  const q = request.nextUrl.searchParams;
  let p = q.get("p") ?? "";
  let s = q.get("s") ?? "";
  if ((!p || !s) && request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { p?: unknown; s?: unknown };
    p = typeof body.p === "string" ? body.p : p;
    s = typeof body.s === "string" ? body.s : s;
  }
  return { p, s };
}

/**
 * GET /api/reminders/unsubscribe?p=<patient id>&s=<signature>
 *
 * Who the link is for, so the page can ask before changing anything (email
 * scanners open links on their own). No personal data: the clinic name and
 * whether reminders are still on.
 *
 * Auth: none; the signed link is the proof (see reminder-unsubscribe.ts)
 *
 * Responses:
 *   200  { clinic, subscribed }
 *   404  Unknown, deleted or wrongly signed link
 */
export async function GET(request: NextRequest) {
  const { p, s } = await readLink(request);
  if (!isValidUnsubscribe(p, s)) return NextResponse.json(NOT_FOUND, { status: 404 });
  const target = await ReminderRepository.unsubscribeTarget(p);
  if (!target) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json({ clinic: target.clinicName, subscribed: target.subscribed }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/reminders/unsubscribe?p=&s=   (or JSON { p, s })
 *
 * Stops appointment reminder emails for the patient. Also the one-click
 * target of the List-Unsubscribe header (RFC 8058): mail apps POST
 * "List-Unsubscribe=One-Click" to the link. Doing it twice is harmless.
 *
 * Responses:
 *   200  { unsubscribed: true }
 *   404  Unknown, deleted or wrongly signed link
 */
export async function POST(request: NextRequest) {
  const { p, s } = await readLink(request);
  if (!isValidUnsubscribe(p, s)) return NextResponse.json(NOT_FOUND, { status: 404 });
  if (!(await ReminderRepository.unsubscribeTarget(p))) return NextResponse.json(NOT_FOUND, { status: 404 });
  await ReminderRepository.optOut(p);
  return NextResponse.json({ unsubscribed: true }, { headers: { "Cache-Control": "no-store" } });
}
