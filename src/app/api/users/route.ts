import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { auth } from "../../../lib/auth";
import { UserRepository } from "../../../repository/user-repository";
import { ClinicRepository } from "../../../repository/clinic-repository";
import { CreateUserSchema, ListUsersQuerySchema, UserRole } from "../../../types/users";

/**
 * GET /api/users
 *
 * Lists users according to role permissions and tenant boundary:
 *   - SuperAdmin: Returns all users across all clinics, excluding the calling SuperAdmin. Can optionally filter by ?clinic_id=... and ?role=...
 *   - Admin: Strictly scoped to their own clinic's staff (returns only Staff users for their session's clinic_id).
 *   - Staff: Forbidden (403).
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin
 *
 * Query Params:
 *   clinic_id?: string (UUID — SuperAdmin only)
 *   role?:      "SuperAdmin" | "Admin" | "Staff" (SuperAdmin only)
 *
 * Responses:
 *   200  { users: PublicUser[] }
 *   400  Invalid query parameters
 *   401  Not authenticated
 *   403  Forbidden
 */
export async function GET(request: NextRequest) {
  // 1. Auth guard
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callerRole = session.user.role;

  // 2. SuperAdmin flow: can view all users, optionally filtered
  if (callerRole === UserRole.SuperAdmin) {
    const searchParams = request.nextUrl.searchParams;
    const clinic_id = searchParams.get("clinic_id") ?? undefined;
    const role = searchParams.get("role") ?? undefined;

    const parsedQuery = ListUsersQuerySchema.safeParse({ clinic_id, role });
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const users = await UserRepository.findAll({
      clinic_id:     parsedQuery.data.clinic_id,
      role:          parsedQuery.data.role,
      excludeUserId: session.user.id,
    });

    return NextResponse.json({ users }, { status: 200 });
  }

  // 3. Admin flow: strictly scoped to staff members in the Admin's clinic
  if (callerRole === UserRole.Admin) {
    const callerClinicId = session.user.clinic_id;
    if (!callerClinicId) {
      return NextResponse.json(
        { error: "Forbidden: Admin is not associated with a clinic" },
        { status: 403 }
      );
    }

    const users = await UserRepository.findAll({
      clinic_id: callerClinicId,
      role: UserRole.Staff,
    });

    return NextResponse.json({ users }, { status: 200 });
  }

  // 4. Staff cannot list users
  return NextResponse.json(
    { error: "Forbidden: Admin or SuperAdmin role required" },
    { status: 403 }
  );
}

/**
 * POST /api/users
 *
 * Creates a new Admin or Staff user. Only one SuperAdmin may exist, so a
 * SuperAdmin can only be created while none exists.
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
 *   clinic_id  string? (UUID — required for Admin/Staff, must be omitted for SuperAdmin)
 *
 * Responses:
 *   201  { user: PublicUser }
 *   400  Zod validation error or malformed JSON
 *   401  Not authenticated
 *   403  Not SuperAdmin
 *   409  Email already in use / a SuperAdmin already exists
 */
export async function POST(request: NextRequest) {
  // 1. Auth guard — must have a valid JWT cookie
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization — only SuperAdmin may use this endpoint
  const callerRole = session.user.role;
  if (callerRole !== UserRole.SuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: SuperAdmin role required" },
      { status: 403 }
    );
  }

  // 3. Parse and validate request body with Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. The platform allows exactly one SuperAdmin
  if (parsed.data.role === UserRole.SuperAdmin && (await UserRepository.superAdminExists())) {
    return NextResponse.json(
      { error: "Validation failed", details: { fieldErrors: { role: ["Only one SuperAdmin is allowed on the platform."] } } },
      { status: 409 }
    );
  }

  // 5. The clinic must exist, otherwise the insert fails on the foreign key
  if (parsed.data.clinic_id && !(await ClinicRepository.exists(parsed.data.clinic_id))) {
    return NextResponse.json(
      { error: "Validation failed", details: { fieldErrors: { clinic_id: ["Clinic not found."] } } },
      { status: 400 }
    );
  }

  // 6. Check email uniqueness before touching the DB further
  const exists = await UserRepository.emailExists(parsed.data.email);
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // 7. Hash password with Argon2id (memory-hard, OWASP top recommendation)
  const password_hash = await argon2.hash(parsed.data.password, {
    type:        argon2.argon2id,
    memoryCost:  65536, // 64 MB
    timeCost:    3,
    parallelism: 4,
  });

  // 8. Persist via repository — raw password never touches the DB layer
  const newUser = await UserRepository.createUser({
    ...parsed.data, 
    password_hash,
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
}