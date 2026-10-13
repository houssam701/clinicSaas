import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { signIn } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { LoginSchema } from "../../../../types/users";

/**
 * POST /api/auth/login
 *
 * Custom login endpoint that accepts JSON (no CSRF token required).
 * Validates credentials, verifies password with Argon2id, and sets the
 * HttpOnly JWT session cookie via NextAuth.
 *
 * Body:
 *   email    string  (valid email)
 *   password string  (min 8 chars)
 *
 * Responses:
 *   200  { message: "Logged in", user: { email, name, role, clinic_id } }
 *   400  Zod validation error
 *   401  Invalid email or password
 */
export async function POST(request: NextRequest) {
  // 1. Parse + validate body with Zod
  const body = await request.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 2. Fetch user from DB via repository
  const user = await UserRepository.findByEmail(parsed.data.email);
  if (!user) {
    // Return generic message — do not reveal whether email exists
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // 3. Verify password with Argon2id
  const valid = await argon2.verify(user.password_hash, parsed.data.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // 4. Sign in via NextAuth — sets the HttpOnly JWT cookie in the response
  await signIn("credentials", {
    email:    parsed.data.email,
    password: parsed.data.password,
    redirect: false, // Do not redirect — return JSON response
  });

  return NextResponse.json(
    {
      message: "Logged in successfully",
      user: {
        id:        user.id,
        email:     user.email,
        name:      `${user.first_name} ${user.last_name}`,
        role:      user.role,
        clinic_id: user.clinic_id,
      },
    },
    { status: 200 }
  );
}
