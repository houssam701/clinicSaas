import { ROLE_HOME_PATH } from "../config/role-routes";
import type { UserRole } from "../types/users";

/** Single source of truth for "where does this role land?". */
export function getHomePathForRole(role: UserRole): string {
  return ROLE_HOME_PATH[role];
}
