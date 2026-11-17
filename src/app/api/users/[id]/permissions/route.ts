import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { UserRepository } from "../../../../../repository/user-repository";
import { PermissionRepository } from "../../../../../repository/permission-repository";
import { UserRole } from "../../../../../types/users";
import {
  BulkReplacePermissionsSchema,
  CreatePermissionSchema,
} from "../../../../../types/permissions";
import { UUID_REGEX } from "../../../../../services/api-guard";
import { applyAccessChange, emptyGrid, getGrid } from "../../../../../services/access";
import type { PermissionGrid } from "../../../../../config/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]/permissions
 *
 * Lists a user's module permissions.
 *
 * Auth:          Required
 * Authorization:
 *   - SuperAdmin: Can view permissions for any user across all clinics.
 *   - Admin:      Can view permissions for users within their own clinic (including their own).
 *   - Staff:      Can only view their own permissions.
 *
 * Responses:
 *   200  { permissions: UserPermissionModel[] }
 *   400  Invalid user ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  // 1. Authenticate caller
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate URL params
  const { id: userId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    );
  }

  // 3. Verify target user exists
  const targetUser = await UserRepository.findById(userId);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Access control
  const caller = session.user;
  if (caller.role === UserRole.SuperAdmin) {
    // SuperAdmin has full read access
  } else if (caller.role === UserRole.Admin) {
    if (!caller.clinic_id || targetUser.clinic_id !== caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access permissions of users outside your clinic" },
        { status: 403 }
      );
    }
  } else if (caller.role === UserRole.Staff) {
    if (targetUser.id !== caller.id) {
      return NextResponse.json(
        { error: "Forbidden: Staff can only view their own permissions" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 5. Fetch permissions
  const permissions = await PermissionRepository.findByUserId(userId);
  return NextResponse.json({ permissions }, { status: 200 });
}

/**
 * PUT /api/users/[id]/permissions
 *
 * Replaces all module permissions for a user, then trims the access of every
 * user they created (recursively) so nobody keeps more than their creator.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or an Admin of the same clinic with can_edit on
 *                "Staff" (target is Staff) or "Admins" (target is Admin).
 *                An Admin can only grant access they have themselves, and
 *                cannot change their own access.
 *
 * Body:
 *   Array of:
 *     module_name: one of PERMISSION_MODULES (src/config/permissions.ts)
 *     can_view?:   boolean (default: false; implied by the other three)
 *     can_create?: boolean (default: false)
 *     can_edit?:   boolean (default: false)
 *     can_delete?: boolean (default: false)
 *   OR { permissions: [...] }
 *
 * Responses:
 *   200  { message: string, permissions: UserPermissionModel[] }
 *   400  Validation error / duplicate modules / management modules for Staff
 *   401  Unauthorized
 *   403  Forbidden / grants more than the caller has
 *   404  User not found
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  // 1. Authenticate caller
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate URL params
  const { id: userId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    );
  }

  // 3. Verify target user exists
  const targetUser = await UserRepository.findById(userId);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const parsed = BulkReplacePermissionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 5. Authorize, check the ceiling, save and cascade
  const requested: PermissionGrid = emptyGrid();
  for (const { module_name, ...flags } of parsed.data) requested[module_name] = flags;

  const result = await applyAccessChange(session.user, targetUser, requested);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      message: "Permissions replaced successfully",
      permissions: await PermissionRepository.findByUserId(userId),
    },
    { status: 200 }
  );
}

/**
 * POST /api/users/[id]/permissions
 *
 * Adds a single module permission for a user. Same authorization, ceiling and
 * cascade as PUT.
 *
 * Body:
 *   module_name  one of PERMISSION_MODULES (required)
 *   can_view     boolean (optional, default: false; implied by the other three)
 *   can_create   boolean (optional, default: false)
 *   can_edit     boolean (optional, default: false)
 *   can_delete   boolean (optional, default: false)
 *
 * Responses:
 *   201  { message: string, permission: UserPermissionModel }
 *   400  Validation error / management modules for Staff
 *   401  Unauthorized
 *   403  Forbidden / grants more than the caller has
 *   404  User not found
 *   409  Module permission already exists for this user
 */
export async function POST(request: NextRequest, context: RouteContext) {
  // 1. Authenticate caller
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate URL params
  const { id: userId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    );
  }

  // 3. Verify target user exists
  const targetUser = await UserRepository.findById(userId);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const parsed = CreatePermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 5. Check unique constraint (user_id, module_name)
  const { module_name, ...flags } = parsed.data;
  if (await PermissionRepository.findByUserAndModule(userId, module_name)) {
    return NextResponse.json(
      {
        error: `Permission for module '${module_name}' already exists for this user. Use PATCH or PUT to update it.`,
      },
      { status: 409 }
    );
  }

  // 6. Authorize, check the ceiling, save and cascade
  const requested = await getGrid(targetUser);
  requested[module_name] = flags;
  const result = await applyAccessChange(session.user, targetUser, requested);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      message: "Permission created successfully",
      permission: await PermissionRepository.findByUserAndModule(userId, module_name),
    },
    { status: 201 }
  );
}
