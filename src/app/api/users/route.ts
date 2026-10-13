import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { auth } from "../../../lib/auth";
import { UserRepository } from "../../../repository/user-repository";
import { CreateUserSchema, UserRole } from "../../../types/users";

/**
 * POST /api/users
 *
 * Creates a new user of any role (SuperAdmin, Admin, or Staff).
 *
 * Auth:          Required
 * Authorization: SuperAdmin only
 *
 * Body:
 *   email      string  (valid email)
 *   password   string  (min 8 chars — hashed with Argon2id before storage)
 *   first_name string
 *   last_name  string
 *   role       "SuperAdmin" | "Admin" | "Staff"
 *   clinic_id  string? (UUID, optional — required for Admin/Staff)
 *
 * Responses:
 *   201  { user: PublicUser }
 *   400  Zod validation error
 *   401  Not authenticated
 *   403  Not SuperAdmin
 *   409  Email already in use
 */
export async function POST(request: NextRequest) {
  // 1. Auth guard — must have a valid JWT cookie
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization — only SuperAdmin may use this endpoint
  const callerRole = (session.user as any).role as UserRole;
  if (callerRole !== UserRole.SuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: SuperAdmin role required" },
      { status: 403 }
    );
  }

  // 3. Parse and validate request body with Zod
  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Check email uniqueness before touching the DB further
  const exists = await UserRepository.emailExists(parsed.data.email);
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // 5. Hash password with Argon2id (memory-hard, OWASP top recommendation)
  const password_hash = await argon2.hash(parsed.data.password, {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 4,
  });

  // 6. Persist via repository — raw password never touches the DB layer
  const newUser = await UserRepository.createUser({
    ...parsed.data, 
    password_hash,
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}