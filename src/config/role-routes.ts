import { UserRole } from "@/types/users";

export const LOGIN_PATH = "/login";

/**
 * Landing page for each role after login.
 * Typed as Record<UserRole, string> so adding a role to the enum fails
 * compilation until its home route is declared here.
 */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "/platform/dashboard",
  [UserRole.Admin]: "/dashboard",
  [UserRole.Staff]: "/dashboard",
};
