import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/services";
import { UserRepository } from "@/repository/user-repository";
import { ChangePasswordSchema, UserRole } from "@/types/users";
import { hashPassword, verifyPassword } from "@/lib/password";
import { PASSWORD_CHANGE_LIMIT, attemptKeys } from "@/config/auth-limits";
import { clearFailures, describeWait, recordFailure, secondsUntilAllowed } from "@/services/attempt-limit";

/**
 * POST /api/auth/password
 *
 * The signed-in user changes their own password. The current password is
 * required (a borrowed or stolen session alone cannot change it), and wrong
 * guesses are limited (PASSWORD_CHANGE_LIMIT). The new hash signs out every
 * session of this user, this one included: the caller signs in again with
 * the new password (see changePasswordAction).
 *
 * Auth:   Required (any role)
 * Body:   { current_password: string, new_password: string (8–200) }
 *
 * Responses:
 *   200  { message }
 *   400  Malformed JSON or validation error (details.fieldErrors)
 *   401  Unauthorized
 *   422  Current password is wrong (details.fieldErrors.current_password)
 *   429  Too many wrong current passwords lately ({ error, retry_after })
 */
export async function POST(request: NextRequest) {
  const { session, error } = await authenticate([UserRole.SuperAdmin, UserRole.Admin, UserRole.Staff]);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const key = attemptKeys.passwordChange(session.user.id);
  const wait = await secondsUntilAllowed(key, PASSWORD_CHANGE_LIMIT);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many wrong passwords. Try again in ${describeWait(wait)}.`, retry_after: wait },
      { status: 429, headers: { "Retry-After": String(wait) } }
    );
  }

  const user = await UserRepository.findSessionState(session.user.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyPassword(user.password_hash, parsed.data.current_password))) {
    await recordFailure(key);
    return NextResponse.json(
      { error: "Validation failed", details: { fieldErrors: { current_password: ["Your current password is not correct."] } } },
      { status: 422 }
    );
  }

  await UserRepository.updateUser(user.id, { password_hash: await hashPassword(parsed.data.new_password) });
  await clearFailures(key);
  return NextResponse.json({ message: "Password changed" }, { status: 200 });
}
