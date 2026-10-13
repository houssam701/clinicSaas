import { NextResponse } from "next/server";
import { auth, signOut } from "../../../../lib/auth";

/**
 * POST /api/auth/logout
 *
 * Custom logout endpoint that accepts JSON (no CSRF token required).
 * Clears the HttpOnly JWT session cookie via NextAuth.
 *
 * Auth:   Required (must be logged in)
 * Body:   None
 *
 * Responses:
 *   200  { message: "Logged out" }
 *   401  Not authenticated
 */
export async function POST() {
  // 1. Verify there is an active session before attempting logout
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Sign out via NextAuth — clears the HttpOnly JWT cookie
  await signOut({ redirect: false });

  return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}
