import { UserRole } from "@/types/users";

/** How each role is named on screen. */
export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "Super Admin",
  [UserRole.Admin]: "Admin",
  [UserRole.Staff]: "Staff",
};

/** One badge color per role, everywhere a role is shown. */
export const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  [UserRole.Admin]: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  [UserRole.Staff]: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
