import { UserRole } from "@/types/users";
import { PATHS } from "@/config/path";

export const LOGIN_PATH = PATHS.login;

/**
 * Landing page for each role after login.
 * Typed as Record<UserRole, string> so adding a role to the enum fails
 * compilation until its home route is declared here.
 */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: PATHS.platform.dashboard,
  [UserRole.Admin]: PATHS.dashboard,
  [UserRole.Staff]: PATHS.dashboard,
};
