import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { ClinicRepository } from "../../../../repository/clinic-repository";
import { PermissionRepository } from "../../../../repository/permission-repository";
import { UserRole } from "../../../../types/users";

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's full public profile,
 * fetched fresh from the database (not just the JWT payload),
 * plus the clinic they belong to (null for SuperAdmin) and their own
 * module permissions, so pages need one call to know what to show.
 *
 * Auth:   Required (any role)
 * Cookie: HttpOnly JWT set by NextAuth at login
 *
 * Responses:
 *   200  { user: PublicUser, clinic: ClinicModel | null, permissions: UserPermissionModel[] }
 *        (permissions is empty for the SuperAdmin, who has full access without rows)
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

  // 3. The caller's own clinic (Admin/Staff can't read /api/clinics/[id]) and permissions, in parallel
  const [clinic, permissions] = await Promise.all([
    user.clinic_id ? ClinicRepository.findById(user.clinic_id) : null,
    user.role === UserRole.SuperAdmin ? [] : PermissionRepository.findByUserId(user.id),
  ]);

  return NextResponse.json({ user, clinic, permissions }, { status: 200 });
}
