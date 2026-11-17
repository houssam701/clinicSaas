import { z } from "../lib/zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";
import { PERMISSION_MODULES, type PermissionModule } from "../config/permissions";

// ─── DB Model Type ────────────────────────────────────────────────────────────
// Derived directly from the emitted Prisma 8 contract
export type UserPermissionModel = FieldOutputTypes["public"]["UserPermission"];

// ─── Domain Types ─────────────────────────────────────────────────────────────
export interface CreatePermissionData {
  user_id: string;
  module_name: PermissionModule;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface UpdatePermissionData {
  module_name?: PermissionModule;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ModuleNameSchema = z.enum(PERMISSION_MODULES, {
  message: `Module must be one of: ${PERMISSION_MODULES.join(", ")}.`,
});

const PermissionFlagsSchema = z.object({
  module_name: ModuleNameSchema,
  can_view:    z.boolean().optional().default(false),
  can_create:  z.boolean().optional().default(false),
  can_edit:    z.boolean().optional().default(false),
  can_delete:  z.boolean().optional().default(false),
});

/** Creating, editing or deleting something you cannot see makes no sense: they imply view. */
const withImpliedView = <T extends { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>(p: T): T => ({
  ...p,
  can_view: p.can_view || p.can_create || p.can_edit || p.can_delete,
});

// Add a single module permission: POST /api/users/[id]/permissions
export const CreatePermissionSchema = PermissionFlagsSchema.transform(withImpliedView);

// Single item in bulk replace
export const PermissionItemSchema = PermissionFlagsSchema.transform(withImpliedView);

// Bulk replace: PUT /api/users/[id]/permissions
// Accepts either an array of permissions [ ... ] or an object { permissions: [ ... ] }
export const BulkReplacePermissionsSchema = z
  .union([
    z.array(PermissionItemSchema),
    z.object({
      permissions: z.array(PermissionItemSchema),
    }),
  ])
  .transform((val) => (Array.isArray(val) ? val : val.permissions))
  .refine(
    (items) => {
      const names = items.map((i) => i.module_name.toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: "Each module can only appear once in the permissions list." }
  );

// Update single permission: PATCH /api/users/[id]/permissions/[permissionId]
export const UpdatePermissionSchema = z
  .object({
    module_name: ModuleNameSchema.optional(),
    can_view:    z.boolean().optional(),
    can_create:  z.boolean().optional(),
    can_edit:    z.boolean().optional(),
    can_delete:  z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Change at least one permission before saving." }
  );

// Inferred Types
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof UpdatePermissionSchema>;
export type BulkReplacePermissionsInput = z.infer<typeof BulkReplacePermissionsSchema>;
