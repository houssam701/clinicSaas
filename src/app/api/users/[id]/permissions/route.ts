import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { UserRepository } from "../../../../../repository/user-repository";
import { PermissionRepository } from "../../../../../repository/permission-repository";
import { UserRole } from "../../../../../types/users";
import {
  BulkReplacePermissionsSchema,
  CreatePermissionSchema,
} from "../../../../../types/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users/[id]/permissions
 *
 * Lists a user's module permissions.
 *
 * Auth:          Required
 * Authorization:
 *   - SuperAdmin: Can view permissions for any user across all clinics.
 *   - Admin:      Can view permissions for users within their own clinic.
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
 * Bulk replaces all module permissions for a user.
 * Existing permissions for the user are removed and replaced with the provided set.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin restricted to their clinic)
 *
 * Body:
 *   Array of:
 *     module_name: string
 *     can_view?:   boolean (default: false)
 *     can_create?: boolean (default: false)
 *     can_edit?:   boolean (default: false)
 *     can_delete?: boolean (default: false)
 *   OR { permissions: [...] }
 *
 * Responses:
 *   200  { message: string, permissions: UserPermissionModel[] }
 *   400  Validation error / Duplicate modules
 *   401  Unauthorized
 *   403  Forbidden
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

  // 4. Authorization check for mutation
  const caller = session.user;
  if (caller.role === UserRole.SuperAdmin) {
    // SuperAdmin can manage any user's permissions
  } else if (caller.role === UserRole.Admin) {
    if (!caller.clinic_id || targetUser.clinic_id !== caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot manage permissions for users outside your clinic" },
        { status: 403 }
      );
    }
    if (targetUser.role === UserRole.SuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admins cannot manage SuperAdmin permissions" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Forbidden: Only Admin or SuperAdmin can modify permissions" },
      { status: 403 }
    );
  }

  // 5. Parse and validate body
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

  // 6. Execute atomic bulk replace inside database transaction
  const updatedPermissions = await PermissionRepository.bulkReplacePermissions(
    userId,
    parsed.data
  );

  return NextResponse.json(
    {
      message: "Permissions replaced successfully",
      permissions: updatedPermissions,
    },
    { status: 200 }
  );
}

/**
 * POST /api/users/[id]/permissions
 *
 * Adds a single module permission for a user.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin restricted to their clinic)
 *
 * Body:
 *   module_name  string  (required)
 *   can_view     boolean (optional, default: false)
 *   can_create   boolean (optional, default: false)
 *   can_edit     boolean (optional, default: false)
 *   can_delete   boolean (optional, default: false)
 *
 * Responses:
 *   201  { message: string, permission: UserPermissionModel }
 *   400  Validation error
 *   401  Unauthorized
 *   403  Forbidden
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

  // 4. Authorization check for mutation
  const caller = session.user;
  if (caller.role === UserRole.SuperAdmin) {
    // SuperAdmin allowed
  } else if (caller.role === UserRole.Admin) {
    if (!caller.clinic_id || targetUser.clinic_id !== caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Cannot manage permissions for users outside your clinic" },
        { status: 403 }
      );
    }
    if (targetUser.role === UserRole.SuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admins cannot manage SuperAdmin permissions" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Forbidden: Only Admin or SuperAdmin can modify permissions" },
      { status: 403 }
    );
  }

  // 5. Parse and validate body
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

  // 6. Check unique constraint (user_id, module_name)
  const existing = await PermissionRepository.findByUserAndModule(
    userId,
    parsed.data.module_name
  );
  if (existing) {
    return NextResponse.json(
      {
        error: `Permission for module '${parsed.data.module_name}' already exists for this user. Use PATCH or PUT to update it.`,
      },
      { status: 409 }
    );
  }

  // 7. Create permission
  const permission = await PermissionRepository.createPermission({
    user_id:     userId,
    module_name: parsed.data.module_name,
    can_view:    parsed.data.can_view,
    can_create:  parsed.data.can_create,
    can_edit:    parsed.data.can_edit,
    can_delete:  parsed.data.can_delete,
  });

  return NextResponse.json(
    {
      message: "Permission created successfully",
      permission,
    },
    { status: 201 }
  );
}
