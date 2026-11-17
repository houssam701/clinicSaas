import { NextRequest, NextResponse, after } from "next/server";
import { UserRepository } from "@/repository/user-repository";
import { PasswordResetRepository } from "@/repository/password-reset-repository";
import { RequestPasswordResetSchema } from "@/types/users";
import { RESET_LINK_MINUTES, RESET_REQUEST_LIMIT, attemptKeys } from "@/config/auth-limits";
import { recordFailure, secondsUntilAllowed } from "@/services/attempt-limit";
import { hashResetToken, newResetToken } from "@/services/password-reset";
import { getEmailSender } from "@/services/email";
import { passwordResetEmail } from "@/emails/password-reset";
import { getBaseUrl } from "@/lib/api";
import { PATHS } from "@/config/path";

/** The same answer whether or not the email has an account. */
const SENT = { message: "If an account uses this email, a link to reset the password is on its way." };

/**
 * POST /api/auth/password-reset   { email }
 *
 * Emails a link to choose a new password (valid RESET_LINK_MINUTES, once).
 * Always answers the same, and sends after responding, so neither the text
 * nor the timing reveals whether the email has an account. At most
 * RESET_REQUEST_LIMIT requests per email (more are silently not sent).
 *
 * Auth: none (the person cannot sign in)
 *
 * Responses:
 *   200  { message }
 *   400  Malformed JSON or validation error
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = RequestPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email;

  after(async () => {
    try {
      const key = attemptKeys.resetRequest(email);
      if ((await secondsUntilAllowed(key, RESET_REQUEST_LIMIT)) > 0) return;
      await recordFailure(key); // every request counts toward the limit

      const user = await UserRepository.findByEmail(email);
      if (!user) return;

      const { token, hash } = newResetToken();
      const now = Date.now();
      await PasswordResetRepository.create(user.id, hash, new Date(now + RESET_LINK_MINUTES * 60_000).toISOString());
      await PasswordResetRepository.pruneExpired(new Date(now - 24 * 3_600_000).toISOString());

      const link = `${getBaseUrl()}${PATHS.resetPassword({ token })}`;
      await getEmailSender().send(passwordResetEmail({ to: user.email, firstName: user.first_name, link, minutes: RESET_LINK_MINUTES }));
    } catch (error) {
      // Logged for the operator; the link itself is never logged
      console.error("[password-reset] could not send the reset email:", error instanceof Error ? error.message : error);
    }
  });

  return NextResponse.json(SENT, { status: 200 });
}

/**
 * GET /api/auth/password-reset?token=
 *
 * Whether a reset link can still be used (the reset page checks before
 * showing the form).
 *
 * Responses:
 *   200  { valid: boolean }
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const valid = token.length >= 20 && token.length <= 200
    ? await PasswordResetRepository.isValid(hashResetToken(token), new Date().toISOString())
    : false;
  return NextResponse.json({ valid }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
