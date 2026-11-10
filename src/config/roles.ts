import { UserRole } from "@/types/users";

/** How each role is named on screen. */
export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "Super Admin",
  [UserRole.Admin]: "Admin",
  [UserRole.Staff]: "Staff",
};

