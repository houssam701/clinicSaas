import { cache } from "react";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import { PERMISSION_MODULES, type PermissionGrid } from "@/config/permissions";
import { fullGrid, gridFromRows } from "@/lib/permission-grid";
import { UserRole, type PublicUser } from "@/types/users";
import type { UserPermissionModel } from "@/types/permissions";

export type AccessPageData = {
  me: PublicUser;
  user: PublicUser;
  /** The user's current access */
  grid: PermissionGrid;
  /** What the signed-in user can give: their own access, or everything for the SuperAdmin */
  ceiling: PermissionGrid;
  /** Saved rows whose module is not in PERMISSION_MODULES (ignored by every check) */
  unknownModules: string[];
};

/**
 * The signed-in user and what they can do (everything for the SuperAdmin),
 * from one GET /api/auth/me call. Null when signed out.
 *
 * Wrapped in React's cache(), so the layout and the page share one result per
 * request instead of each calling the API. A new request always reads fresh
 * permissions, so revoked access still applies on the next click.
 */
export const loadMyAccess = cache(
  async (): Promise<{ me: PublicUser; grid: PermissionGrid } | null> => {
    const res = await serverApiFetch(API_PATHS.auth.me);
    if (!res.ok) return null;
    const { user: me, permissions }: { user: PublicUser; permissions: UserPermissionModel[] } = await res.json();
    return { me, grid: me.role === UserRole.SuperAdmin ? fullGrid() : gridFromRows(permissions) };
  }
);

/**
 * Loads everything an access page needs through the API: the signed-in user
 * and their access (shared with the layout via loadMyAccess), the target user,
 * and the target's permissions. Returns null when the target cannot be loaded
 * (missing, or outside the caller's clinic), and "error" when permissions
 * could not be read.
 */
export async function loadAccessPage(userId: string): Promise<AccessPageData | null | "error"> {
  const [mine, userRes, permissionsRes] = await Promise.all([
    loadMyAccess(),
    serverApiFetch(API_PATHS.users.detail(userId)),
    serverApiFetch(API_PATHS.users.permissions(userId)),
  ]);
  if (!mine || !userRes.ok) return null;
  if (!permissionsRes.ok) return "error";

  const { user }: { user: PublicUser } = await userRes.json();
  const { permissions }: { permissions: UserPermissionModel[] } = await permissionsRes.json();

  return {
    me: mine.me,
    user,
    grid: gridFromRows(permissions),
    ceiling: mine.grid,
    unknownModules: permissions
      .map((p) => p.module_name)
      .filter((name) => !(PERMISSION_MODULES as readonly string[]).includes(name)),
  };
}
