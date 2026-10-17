import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { UserRepository } from "../../../../../../repository/user-repository";
import { PermissionRepository } from "../../../../../../repository/permission-repository";
import { UserRole } from "../../../../../../types/users";
import { UpdatePermissionSchema } from "../../../../../../types/permissions";

interface RouteContext {
  params: Promise<{ id: string; permissionId: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/users/[id]/permissions/[permissionId]
 *
 * Updates a single module permission for a user.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin restricted to their clinic)
 *
 * Body:
 *   module_name?: string
 *   can_view?:    boolean
 *   can_create?:  boolean
 *   can_edit?:    boolean
 *   can_delete?:  boolean
 *   (At least one field must be provided)
 *
 * Responses:
 *   200  { message: string, permission: UserPermissionModel }
 *   400  Validation error / Invalid ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User or permission not found
 *   409  Module name collision
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // 1. Authenticate caller
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate URL params
  const { id: userId, permissionId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    );
  }
  if (!UUID_REGEX.test(permissionId)) {
    return NextResponse.json(
      { error: "Invalid permission ID format" },
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

  // 5. Verify permission exists and belongs to the specified user
  const permission = await PermissionRepository.findById(permissionId);
  if (!permission || permission.user_id !== userId) {
    return NextResponse.json(
      { error: "Permission not found for this user" },
      { status: 404 }
    );
  }

  // 6. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const parsed = UpdatePermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 7. Check for module name collision if module_name is being changed
  if (
    parsed.data.module_name &&
    parsed.data.module_name !== permission.module_name
  ) {
    const conflict = await PermissionRepository.hasModuleConflict(
      userId,
      parsed.data.module_name,
      permissionId
    );
    if (conflict) {
      return NextResponse.json(
        {
          error: `Permission for module '${parsed.data.module_name}' already exists for this user.`,
        },
        { status: 409 }
      );
    }
  }

  // 8. Update permission
  const updated = await PermissionRepository.updatePermission(
    permissionId,
    parsed.data
  );

  return NextResponse.json(
    {
      message: "Permission updated successfully",
      permission: updated,
    },
    { status: 200 }
  );
}

/**
 * DELETE /api/users/[id]/permissions/[permissionId]
 *
 * Removes a single module permission from a user.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin restricted to their clinic)
 *
 * Responses:
 *   200  { message: string }
 *   400  Invalid ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User or permission not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  // 1. Authenticate caller
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate URL params
  const { id: userId, permissionId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return NextResponse.json(
      { error: "Invalid user ID format" },
      { status: 400 }
    );
  }
  if (!UUID_REGEX.test(permissionId)) {
    return NextResponse.json(
      { error: "Invalid permission ID format" },
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

  // 5. Verify permission exists and belongs to the specified user
  const permission = await PermissionRepository.findById(permissionId);
  if (!permission || permission.user_id !== userId) {
    return NextResponse.json(
      { error: "Permission not found for this user" },
      { status: 404 }
    );
  }

  // 6. Delete permission
  await PermissionRepository.deletePermission(permissionId);

  return NextResponse.json(
    { message: "Permission deleted successfully" },
    { status: 200 }
  );
}
