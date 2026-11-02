import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { CreateTeamMemberSchema, UserRole } from "../../../../types/users";
import { can, getGrid, saveGrid, teamModuleFor } from "../../../../services/access";

/**
 * POST /api/admin/users
 *
 * Creates a Staff member or another Admin in the calling Admin's clinic.
 *
 * Auth:          Required
 * Authorization: Admin with can_create on "Staff" (to create Staff) or on
 *                "Admins" (to create Admins).
 *
 * Body:
 *   email      string  (valid email)
 *   password   string  (min 8 chars — hashed with Argon2id before storage)
 *   first_name string
 *   last_name  string
 *   role       "Admin" | "Staff"
 *
 * Note: clinic_id is always taken from the Admin's JWT session.
 *       The client cannot specify a different clinic_id.
 *       A new Staff member starts with no access; a new Admin starts with
 *       exactly the creator's access (they can never get more than that).
 *
 * Responses:
 *   201  { user: PublicUser }
 *   400  Zod validation error or malformed JSON
 *   401  Not authenticated
 *   403  Not Admin / no associated clinic / missing can_create permission
 *   409  Email already in use
 */
export async function POST(request: NextRequest) {
  // 1. Auth guard — must have a valid JWT cookie
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization — only Admin role may use this endpoint
  if (session.user.role !== UserRole.Admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 }
    );
  }

  // 3. Parse and validate (role is Admin or Staff, clinic_id is omitted)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. The Admin must be allowed to create this role
  const teamModule = teamModuleFor(parsed.data.role);
  if (!(await can(session.user, teamModule, "can_create"))) {
    return NextResponse.json(
      { error: `Forbidden: You do not have permission to create ${teamModule.toLowerCase()}` },
      { status: 403 }
    );
  }

  // 5. Pull clinic_id from the verified session — never trust the client for this
  const callerClinicId = session.user.clinic_id;
  if (!callerClinicId) {
    return NextResponse.json(
      { error: "Forbidden: Admin has no associated clinic" },
      { status: 403 }
    );
  }

  // 6. Check email uniqueness
  const exists = await UserRepository.emailExists(parsed.data.email);
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // 7. Hash password with Argon2id
  const password_hash = await argon2.hash(parsed.data.password, {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 4,
  });

  // 8. Persist — clinic_id is injected from session, not from request body
  const newUser = await UserRepository.createUser({
    ...parsed.data,
    clinic_id: callerClinicId,
    password_hash,
    created_by_id: session.user.id,
  });

  // 9. A new Admin inherits exactly the creator's access; Staff start with none
  if (newUser.role === UserRole.Admin) {
    await saveGrid(newUser, await getGrid(session.user));
  }

  return NextResponse.json({ user: newUser }, { status: 201 });
}
