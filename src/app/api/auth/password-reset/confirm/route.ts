import { NextRequest, NextResponse } from "next/server";
import { PasswordResetRepository } from "@/repository/password-reset-repository";
import { ResetPasswordSchema } from "@/types/users";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/services/password-reset";
import { attemptKeys } from "@/config/auth-limits";
import { clearFailures } from "@/services/attempt-limit";

/**
 * POST /api/auth/password-reset/confirm   { token, new_password }
 *
 * Sets a new password from a reset link. The link works once and only
 * until it expires. The new hash signs out every session of the user, and
 * clears their failed sign-ins (so a locked-out user can sign in at once).
 *
 * Auth: none (the token is the proof)
 *
 * Responses:
 *   200  { message }
 *   400  Malformed JSON or validation error
 *   410  The link is unknown, used or expired
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = await PasswordResetRepository.consume(
    hashResetToken(parsed.data.token),
    new Date().toISOString(),
    await hashPassword(parsed.data.new_password)
  );
  if (!email) {
    return NextResponse.json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 410 });
  }

  await clearFailures(attemptKeys.login(email));
  return NextResponse.json({ message: "Password changed" }, { status: 200 });
}
