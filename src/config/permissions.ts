/**
 * Single source of truth for module-level permissions.
 *
 * Every UserPermission.module_name must be one of PERMISSION_MODULES, so a
 * typo ("appointments") can never silently deny access. Admin and Staff are
 * both checked against these rows; only the SuperAdmin bypasses them.
 * The rules (ceiling, cascade) live in src/services/access.ts.
 */

export const PERMISSION_MODULES = [
  "Appointments",
  "Patients",
  "Doctors",
  "Messages",
  "Reviews",
  "Finances",
  // Management: who may see, add, edit (incl. their access) and remove team members
  "Staff",
  "Admins",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/** Modules about managing people. Only Admins can hold them; never Staff. */
export const MANAGEMENT_MODULES: readonly PermissionModule[] = ["Staff", "Admins"];

export const PERMISSION_ACTIONS = ["can_view", "can_create", "can_edit", "can_delete"] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionFlags = Record<PermissionAction, boolean>;

/** Every module with its four flags; a module without a stored row is all false. */
export type PermissionGrid = Record<PermissionModule, PermissionFlags>;

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  can_view: "View",
  can_create: "Create",
  can_edit: "Edit",
  can_delete: "Delete",
};

export const PERMISSION_MODULE_INFO: Record<
  PermissionModule,
  { description: string; /** true once its API routes call checkModulePermission */ enforced: boolean }
> = {
  Appointments: { description: "Calendar, bookings and appointment status", enforced: true },
  Patients: { description: "Patient records, history and documents", enforced: false },
  Doctors: { description: "Doctor profiles and schedules", enforced: false },
  Messages: { description: "Conversations with patients", enforced: false },
  Reviews: { description: "Patient reviews and ratings", enforced: false },
  Finances: { description: "Invoices and payments", enforced: false },
  Staff: { description: "See, add, edit and remove staff, and set their access", enforced: true },
  Admins: { description: "See, add, edit and remove other admins, and set their access", enforced: true },
};
