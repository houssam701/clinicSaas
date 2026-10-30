import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "../../../../lib/auth";
import { LoginSchema, UserRole } from "../../../../types/users";
import { UserRepository } from "../../../../repository/user-repository";
import { getHomePathForRole } from "../../../../services/role-routing";

/**
 * POST /api/auth/login
 *
 * Custom login endpoint that accepts JSON (no CSRF token required).
 * Delegates credential validation and password verification directly to
 * NextAuth's `authorize` callback, which sets the HttpOnly JWT session cookie.
 *
 * Body:
 *   email    string  (valid email)
 *   password string  (min 8 chars)
 *
 * Responses:
 *   200  { message, redirectTo }  (redirectTo = the user's role home path)
 *   400  Zod validation error or malformed JSON
 *   401  Invalid email or password
 */
export async function POST(request: NextRequest) {
  // 1. Parse + validate body with Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 2. Delegate authentication to NextAuth — verifies password in authorize callback
  // and sets the HttpOnly JWT cookie in the response.
  try {
    await signIn("credentials", {
      email:    parsed.data.email,
      password: parsed.data.password,
      redirect: false, // Do not redirect — return JSON response
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    throw error;
  }

  // 3. Tell the caller where this user's role lands
  const user = await UserRepository.findByEmail(parsed.data.email);
  const redirectTo = user ? getHomePathForRole(user.role as UserRole) : "/";

  return NextResponse.json(
    { message: "Logged in successfully", redirectTo },
    { status: 200 }
  );
}

