import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { CreateStaffSchema, UserRole } from "../../../../types/users";

/**
 * POST /api/admin/users
 *
 * Creates a new Staff user scoped to the calling Admin's clinic.
 * The role is locked to "Staff" at the Zod schema level — cannot be overridden
 * by the client even if they manipulate the request body.
 *
 * Auth:          Required
 * Authorization: Admin only
 *
 * Body:
 *   email      string  (valid email)
 *   password   string  (min 8 chars — hashed with Argon2id before storage)
 *   first_name string
 *   last_name  string
 *   role       "Staff"  (enforced by schema — any other value returns 400)
 *
 * Note: clinic_id is always taken from the Admin's JWT session.
 *       The client cannot specify a different clinic_id.
 *
 * Responses:
 *   201  { user: PublicUser }
 *   400  Zod validation error or malformed JSON
 *   401  Not authenticated
 *   403  Not Admin / Admin has no associated clinic
 *   409  Email already in use
 */
export async function POST(request: NextRequest) {
  // 1. Auth guard — must have a valid JWT cookie
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization — only Admin role may use this endpoint
  const callerRole = session.user.role;
  if (callerRole !== UserRole.Admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 }
    );
  }

  // 3. Parse and validate with CreateStaffSchema (role is z.literal("Staff"), clinic_id is omitted)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Pull clinic_id from the verified session — never trust the client for this
  const callerClinicId = session.user.clinic_id;
  if (!callerClinicId) {
    return NextResponse.json(
      { error: "Forbidden: Admin has no associated clinic" },
      { status: 403 }
    );
  }

  // 5. Check email uniqueness
  const exists = await UserRepository.emailExists(parsed.data.email);
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // 6. Hash password with Argon2id
  const password_hash = await argon2.hash(parsed.data.password, {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 4,
  });

  // 7. Persist — clinic_id is injected from session, not from request body
  const newUser = await UserRepository.createUser({
    ...parsed.data,
    clinic_id: callerClinicId,
    password_hash,
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}
