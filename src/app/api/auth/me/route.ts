import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's full public profile,
 * fetched fresh from the database (not just the JWT payload).
 *
 * Auth:   Required (any role)
 * Cookie: HttpOnly JWT set by NextAuth at login
 */
export async function GET() {
  // 1. Verify the JWT cookie and extract the session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch fresh data from DB — ensures we return up-to-date info
  const user = await UserRepository.findById((session.user as any).id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
