/**
 * Shared helpers for the user access (permissions) form.
 *
 * Kept out of the "use server" action file on purpose: every export of a
 * "use server" module becomes a server action the browser can call, so plain
 * helpers belong here.
 */

import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionGrid,
  type PermissionModule,
} from "@/config/permissions";

export type { PermissionFlags, PermissionGrid } from "@/config/permissions";

export type PermissionsFormState = {
  error?: string;
  success?: string;
};

/** Checkbox name for one cell of the grid, e.g. "Appointments.can_edit". */
export const permissionFieldName = (module: PermissionModule, action: PermissionAction) =>
  `${module}.${action}`;

/** Reads every checkbox of the grid: module → { can_view, can_create, ... }. */
export function readPermissionGrid(formData: FormData): PermissionGrid {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module,
      Object.fromEntries(
        PERMISSION_ACTIONS.map((action) => [action, formData.get(permissionFieldName(module, action)) === "on"])
      ),
    ])
  ) as PermissionGrid;
}

/**
 * Reads the grid into the PUT /api/users/[id]/permissions body.
 * Modules with nothing granted are left out, so they have no row at all.
 */
export function readPermissionsForm(formData: FormData) {
  const grid = readPermissionGrid(formData);
  return PERMISSION_MODULES.flatMap((module_name) =>
    Object.values(grid[module_name]).some(Boolean) ? [{ module_name, ...grid[module_name] }] : []
  );
}

/** Maps a failed /api/users/[id]/permissions response (or null) to a form error. */
export async function toPermissionsFormState(response: Response | null): Promise<PermissionsFormState> {
  if (!response) return { error: "Network error — please try again." };

  const data: { error?: string } = await response.json().catch(() => ({}));

  switch (response.status) {
    case 400:
      return { error: data.error ?? "Some permissions are not valid. Please review them." };
    case 401:
      return { error: "Your session has expired. Please sign in again." };
    case 403:
      // Includes the ceiling message, e.g. "You cannot grant access you do not have: Finances: create"
      return { error: data.error ?? "You are not allowed to change this user's access." };
    case 404:
      return { error: "This user no longer exists." };
    default:
      return { error: data.error ?? "Something went wrong. Please try again." };
  }
}
