import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { ClinicRepository } from "../../../../repository/clinic-repository";

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's full public profile,
 * fetched fresh from the database (not just the JWT payload),
 * plus the clinic they belong to (null for SuperAdmin).
 *
 * Auth:   Required (any role)
 * Cookie: HttpOnly JWT set by NextAuth at login
 *
 * Responses:
 *   200  { user: PublicUser, clinic: ClinicModel | null }
 *   401  Not authenticated
 *   404  User not found
 */
export async function GET() {
  // 1. Verify the JWT cookie and extract the session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch fresh data from DB — ensures we return up-to-date info
  const user = await UserRepository.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3. The caller's own clinic — Admin/Staff can't read /api/clinics/[id]
  const clinic = user.clinic_id ? await ClinicRepository.findById(user.clinic_id) : null;

  return NextResponse.json({ user, clinic }, { status: 200 });
}
