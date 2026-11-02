import {
  MANAGEMENT_MODULES,
  PERMISSION_ACTIONS,
  type PermissionAction,
  type PermissionGrid,
  type PermissionModule,
} from "../config/permissions";
import {
  emptyGrid,
  exceeding,
  fullGrid,
  gridFromRows,
  intersect,
  normalizeForRole,
  rowsFromGrid,
  sameGrid,
  teamModuleFor,
  unite,
} from "../lib/permission-grid";
import { PermissionRepository } from "../repository/permission-repository";
import { UserRepository } from "../repository/user-repository";
import { UserRole } from "../types/users";

/**
 * Access rules, in one place (the pure grid math is in src/lib/permission-grid.ts):
 *   - SuperAdmin can do everything; Admin and Staff can only do what their rows grant.
 *   - Ceiling: nobody can give anyone access they do not have themselves.
 *   - Cascade: access removed from a user is removed from everyone they created.
 *   - Management modules (Staff, Admins) are for Admins only.
 */

export { emptyGrid, fullGrid, teamModuleFor };

type Who = { id: string; role: UserRole | string };

/** What this user can actually do. */
export async function getGrid(user: Who): Promise<PermissionGrid> {
  if (user.role === UserRole.SuperAdmin) return fullGrid();
  return gridFromRows(await PermissionRepository.findByUserId(user.id));
}

export async function can(user: Who, module: PermissionModule, action: PermissionAction): Promise<boolean> {
  if (user.role === UserRole.SuperAdmin) return true;
  const row = await PermissionRepository.findByUserAndModule(user.id, module);
  return !!row?.[action];
}

/**
 * Stores a user's access, then trims everyone they created (recursively) so
 * nobody below them keeps access they no longer have.
 */
export async function saveGrid(target: Who, grid: PermissionGrid): Promise<void> {
  await PermissionRepository.bulkReplacePermissions(target.id, rowsFromGrid(normalizeForRole(grid, target.role)));
  await cascade(target.id, normalizeForRole(grid, target.role), new Set([target.id]));
}

async function cascade(creatorId: string, ceiling: PermissionGrid, visited: Set<string>): Promise<void> {
  for (const child of await UserRepository.findCreatedBy(creatorId)) {
    if (child.role === UserRole.SuperAdmin || visited.has(child.id)) continue;
    visited.add(child.id);

    const current = await getGrid(child);
    const trimmed = normalizeForRole(intersect(current, ceiling), child.role);
    if (!sameGrid(current, trimmed)) {
      await PermissionRepository.bulkReplacePermissions(child.id, rowsFromGrid(trimmed));
    }
    await cascade(child.id, trimmed, visited);
  }
}

export type AccessChangeResult =
  | { ok: true; grid: PermissionGrid }
  | { ok: false; status: 400 | 403; error: string };

/**
 * The only way to change someone's access. Checks that the caller may edit the
 * target, that Staff get no management modules, and the ceiling (an Admin can
 * grant only what they have). Then saves and cascades. Used by every
 * /api/users/[id]/permissions route.
 */
export async function applyAccessChange(
  caller: Who & { clinic_id?: string | null },
  target: Who & { clinic_id: string | null },
  requested: PermissionGrid
): Promise<AccessChangeResult> {
  const denied = await checkTeamAccess(caller, target, "can_edit");
  if (denied) return { ok: false, status: 403, error: denied };

  if (target.role === UserRole.Staff && MANAGEMENT_MODULES.some((m) => PERMISSION_ACTIONS.some((a) => requested[m][a]))) {
    return { ok: false, status: 400, error: "Staff cannot manage other users. Make them an Admin first." };
  }

  const grid = normalizeForRole(requested, target.role);
  if (caller.role !== UserRole.SuperAdmin) {
    // Only what is newly added must be within the caller's access; access the target
    // already holds (e.g. granted by the SuperAdmin) can be kept or removed
    const [callerGrid, current] = await Promise.all([getGrid(caller), getGrid(target)]);
    const over = exceeding(grid, unite(callerGrid, current));
    if (over.length > 0) {
      return { ok: false, status: 403, error: `You cannot grant access you do not have: ${over.join(", ")}.` };
    }
  }

  await saveGrid(target, grid);
  return { ok: true, grid };
}

/**
 * Can `caller` manage `target` with this action ("can_view" to see, "can_edit"
 * to change details or access, "can_delete" to remove)? Returns an error
 * message, or null when allowed. Clinic boundaries and the SuperAdmin are
 * checked here too, so routes only call this.
 */
export async function checkTeamAccess(
  caller: Who & { clinic_id?: string | null },
  target: Who & { clinic_id: string | null },
  action: PermissionAction
): Promise<string | null> {
  if (target.role === UserRole.SuperAdmin) return "The SuperAdmin cannot be managed here.";
  if (caller.role === UserRole.SuperAdmin) return null;
  if (caller.role !== UserRole.Admin) return "Only admins can manage team members.";
  if (!caller.clinic_id || caller.clinic_id !== target.clinic_id) return "This user belongs to another clinic.";
  if (caller.id === target.id) return "You cannot change your own access.";

  const teamModule = teamModuleFor(target.role);
  return (await can(caller, teamModule, action))
    ? null
    : `You do not have permission to ${action.replace("can_", "")} ${teamModule.toLowerCase()}.`;
}
