import {
  MANAGEMENT_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionFlags,
  type PermissionGrid,
  type PermissionModule,
} from "@/config/permissions";
import { UserRole } from "@/types/users";
import type { UserPermissionModel } from "@/types/permissions";

/**
 * Pure helpers for permission grids (no database access), shared by the
 * access service, the API routes and the pages.
 */

const flags = (value: boolean): PermissionFlags =>
  Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, value])) as PermissionFlags;

export const emptyGrid = (): PermissionGrid =>
  Object.fromEntries(PERMISSION_MODULES.map((m) => [m, flags(false)])) as PermissionGrid;

export const fullGrid = (): PermissionGrid =>
  Object.fromEntries(PERMISSION_MODULES.map((m) => [m, flags(true)])) as PermissionGrid;

const isKnownModule = (name: string): name is PermissionModule =>
  (PERMISSION_MODULES as readonly string[]).includes(name);

/** Stored rows → full grid. Rows with an unknown module name are ignored. */
export function gridFromRows(rows: UserPermissionModel[]): PermissionGrid {
  const grid = emptyGrid();
  for (const row of rows) {
    if (isKnownModule(row.module_name)) {
      grid[row.module_name] = {
        can_view: row.can_view,
        can_create: row.can_create,
        can_edit: row.can_edit,
        can_delete: row.can_delete,
      };
    }
  }
  return grid;
}

/** Grid → rows to store; modules with nothing granted get no row. */
export function rowsFromGrid(grid: PermissionGrid) {
  return PERMISSION_MODULES.flatMap((module_name) =>
    PERMISSION_ACTIONS.some((a) => grid[module_name][a]) ? [{ module_name, ...grid[module_name] }] : []
  );
}

/** Removes what a role can never hold: management modules for Staff, and action-without-view. */
export function normalizeForRole(grid: PermissionGrid, role: UserRole | string): PermissionGrid {
  const out = emptyGrid();
  for (const m of PERMISSION_MODULES) {
    if (role === UserRole.Staff && MANAGEMENT_MODULES.includes(m)) continue;
    const f = grid[m];
    out[m] = { ...f, can_view: f.can_view || f.can_create || f.can_edit || f.can_delete };
  }
  return out;
}

/** Cell-by-cell AND of two grids. */
export function intersect(a: PermissionGrid, b: PermissionGrid): PermissionGrid {
  const out = emptyGrid();
  for (const m of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) out[m][action] = a[m][action] && b[m][action];
  }
  return out;
}

/** Cell-by-cell OR of two grids. */
export function unite(a: PermissionGrid, b: PermissionGrid): PermissionGrid {
  const out = emptyGrid();
  for (const m of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) out[m][action] = a[m][action] || b[m][action];
  }
  return out;
}

/** Cells granted in `grid` but not in `ceiling`, as "Module: action" labels. */
export function exceeding(grid: PermissionGrid, ceiling: PermissionGrid): string[] {
  return PERMISSION_MODULES.flatMap((m) =>
    PERMISSION_ACTIONS.filter((a) => grid[m][a] && !ceiling[m][a]).map((a) => `${m}: ${a.replace("can_", "")}`)
  );
}

export const sameGrid = (a: PermissionGrid, b: PermissionGrid) =>
  PERMISSION_MODULES.every((m) => PERMISSION_ACTIONS.every((action) => a[m][action] === b[m][action]));

/** Modules that can be shown for a role: Staff never get the management modules. */
export const modulesForRole = (role: UserRole | string): readonly PermissionModule[] =>
  role === UserRole.Staff ? PERMISSION_MODULES.filter((m) => !MANAGEMENT_MODULES.includes(m)) : PERMISSION_MODULES;

/** The management module that governs a target user: "Admins" for Admins, "Staff" for Staff. */
export const teamModuleFor = (role: UserRole | string): PermissionModule =>
  role === UserRole.Admin ? "Admins" : "Staff";
