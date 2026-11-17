import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { UserRepository } from "../../../../../../repository/user-repository";
import { PermissionRepository } from "../../../../../../repository/permission-repository";
import { UpdatePermissionSchema } from "../../../../../../types/permissions";
import { UUID_REGEX } from "../../../../../../services/api-guard";
import { applyAccessChange, checkTeamAccess, getGrid } from "../../../../../../services/access";
import { PERMISSION_MODULES, type PermissionModule } from "../../../../../../config/permissions";

interface RouteContext {
  params: Promise<{ id: string; permissionId: string }>;
}

const isKnownModule = (name: string): name is PermissionModule =>
  (PERMISSION_MODULES as readonly string[]).includes(name);

/** Shared lookups for PATCH and DELETE: session, ids, target user and the permission row. */
async function loadContext(context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { id: userId, permissionId } = await context.params;
  if (!UUID_REGEX.test(userId)) {
    return { error: NextResponse.json({ error: "Invalid user ID format" }, { status: 400 }) } as const;
  }
  if (!UUID_REGEX.test(permissionId)) {
    return { error: NextResponse.json({ error: "Invalid permission ID format" }, { status: 400 }) } as const;
  }

  const targetUser = await UserRepository.findById(userId);
  if (!targetUser) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) } as const;
  }

  const permission = await PermissionRepository.findById(permissionId);
  if (!permission || permission.user_id !== userId) {
    return { error: NextResponse.json({ error: "Permission not found for this user" }, { status: 404 }) } as const;
  }

  return { session, targetUser, permission } as const;
}

/**
 * PATCH /api/users/[id]/permissions/[permissionId]
 *
 * Updates a single module permission for a user. Same authorization, ceiling
 * and cascade as PUT /api/users/[id]/permissions; create/edit/delete imply view.
 *
 * Body:
 *   module_name?: one of PERMISSION_MODULES (moves the flags to that module)
 *   can_view?:    boolean
 *   can_create?:  boolean
 *   can_edit?:    boolean
 *   can_delete?:  boolean
 *   (At least one field must be provided)
 *
 * Responses:
 *   200  { message: string, permission: UserPermissionModel | null }
 *   400  Validation error / Invalid ID format / management modules for Staff
 *   401  Unauthorized
 *   403  Forbidden / grants more than the caller has
 *   404  User or permission not found
 *   409  Module name collision
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // 1. Session, ids, target user and permission row
  const loaded = await loadContext(context);
  if ("error" in loaded) return loaded.error;
  const { session, targetUser, permission } = loaded;

  // 2. Parse and validate body
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

  // 3. Module name collision if the row moves to another module
  const { module_name: newModule, ...changes } = parsed.data;
  const fromModule = permission.module_name;
  const toModule = newModule ?? fromModule;
  if (toModule !== fromModule && (await PermissionRepository.hasModuleConflict(targetUser.id, toModule, permission.id))) {
    return NextResponse.json(
      { error: `Permission for module '${toModule}' already exists for this user.` },
      { status: 409 }
    );
  }
  if (!isKnownModule(toModule)) {
    return NextResponse.json({ error: `Unknown module '${toModule}'.` }, { status: 400 });
  }

  // 4. Build the new grid, then authorize, check the ceiling, save and cascade
  const grid = await getGrid(targetUser);
  const current = isKnownModule(fromModule)
    ? grid[fromModule]
    : { can_view: permission.can_view, can_create: permission.can_create, can_edit: permission.can_edit, can_delete: permission.can_delete };
  if (isKnownModule(fromModule)) {
    grid[fromModule] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
  }
  grid[toModule] = { ...current, ...changes };

  const result = await applyAccessChange(session.user, targetUser, grid);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      message: "Permission updated successfully",
      // null when the update left nothing granted, so the row was removed
      permission: await PermissionRepository.findByUserAndModule(targetUser.id, toModule),
    },
    { status: 200 }
  );
}

/**
 * DELETE /api/users/[id]/permissions/[permissionId]
 *
 * Removes a single module permission from a user (and from everyone they
 * created). Same authorization as PUT /api/users/[id]/permissions.
 *
 * Responses:
 *   200  { message: string }
 *   400  Invalid ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User or permission not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  // 1. Session, ids, target user and permission row
  const loaded = await loadContext(context);
  if ("error" in loaded) return loaded.error;
  const { session, targetUser, permission } = loaded;

  // 2. Rows with an unknown module are ignored by every check: just remove them (still authorized)
  if (!isKnownModule(permission.module_name)) {
    const denied = await checkTeamAccess(session.user, targetUser, "can_edit");
    if (denied) return NextResponse.json({ error: denied }, { status: 403 });
    await PermissionRepository.deletePermission(permission.id);
    return NextResponse.json({ message: "Permission deleted successfully" }, { status: 200 });
  }

  // 3. Authorize, save and cascade (removing access never exceeds the ceiling)
  const grid = await getGrid(targetUser);
  grid[permission.module_name] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
  const result = await applyAccessChange(session.user, targetUser, grid);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { message: "Permission deleted successfully" },
    { status: 200 }
  );
}
