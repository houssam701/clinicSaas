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

const loadPermissions = async (userId: string): Promise<UserPermissionModel[] | null> => {
  const res = await serverApiFetch(API_PATHS.users.permissions(userId));
  return res.ok ? (await res.json()).permissions : null;
};

/**
 * The signed-in user and what they can do (everything for the SuperAdmin),
 * through the API. Null when signed out or the permissions cannot be read.
 */
export async function loadMyAccess(): Promise<{ me: PublicUser; grid: PermissionGrid } | null> {
  const meRes = await serverApiFetch(API_PATHS.auth.me);
  if (!meRes.ok) return null;
  const { user: me }: { user: PublicUser } = await meRes.json();
  if (me.role === UserRole.SuperAdmin) return { me, grid: fullGrid() };

  const permissions = await loadPermissions(me.id);
  return permissions ? { me, grid: gridFromRows(permissions) } : null;
}

/**
 * Loads everything an access page needs through the API: the signed-in user,
 * the target user, and both users' permissions. Returns null when the target
 * cannot be loaded (missing, or outside the caller's clinic), and "error" when
 * permissions could not be read.
 */
export async function loadAccessPage(userId: string): Promise<AccessPageData | null | "error"> {
  const [meRes, userRes, permissions] = await Promise.all([
    serverApiFetch(API_PATHS.auth.me),
    serverApiFetch(API_PATHS.users.detail(userId)),
    loadPermissions(userId),
  ]);
  if (!meRes.ok || !userRes.ok) return null;

  const { user: me }: { user: PublicUser } = await meRes.json();
  const { user }: { user: PublicUser } = await userRes.json();

  const myPermissions = me.role === UserRole.SuperAdmin ? [] : await loadPermissions(me.id);
  if (!permissions || !myPermissions) return "error";

  return {
    me,
    user,
    grid: gridFromRows(permissions),
    ceiling: me.role === UserRole.SuperAdmin ? fullGrid() : gridFromRows(myPermissions),
    unknownModules: permissions
      .map((p) => p.module_name)
      .filter((name) => !(PERMISSION_MODULES as readonly string[]).includes(name)),
  };
}
