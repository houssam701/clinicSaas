import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── DB Model Type ────────────────────────────────────────────────────────────
// Derived directly from the emitted Prisma 8 contract
export type UserPermissionModel = FieldOutputTypes["public"]["UserPermission"];

// ─── Domain Types ─────────────────────────────────────────────────────────────
export interface CreatePermissionData {
  user_id: string;
  module_name: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface UpdatePermissionData {
  module_name?: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

// Add a single module permission: POST /api/users/[id]/permissions
export const CreatePermissionSchema = z.object({
  module_name: z.string().trim().min(1, "module_name is required"),
  can_view:    z.boolean().optional().default(false),
  can_create:  z.boolean().optional().default(false),
  can_edit:    z.boolean().optional().default(false),
  can_delete:  z.boolean().optional().default(false),
});

// Single item in bulk replace
export const PermissionItemSchema = z.object({
  module_name: z.string().trim().min(1, "module_name is required"),
  can_view:    z.boolean().optional().default(false),
  can_create:  z.boolean().optional().default(false),
  can_edit:    z.boolean().optional().default(false),
  can_delete:  z.boolean().optional().default(false),
});

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
    { message: "Duplicate module_name found in permissions list" }
  );

// Update single permission: PATCH /api/users/[id]/permissions/[permissionId]
export const UpdatePermissionSchema = z
  .object({
    module_name: z.string().trim().min(1).optional(),
    can_view:    z.boolean().optional(),
    can_create:  z.boolean().optional(),
    can_edit:    z.boolean().optional(),
    can_delete:  z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one permission field must be provided for update" }
  );

// Inferred Types
export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof UpdatePermissionSchema>;
export type BulkReplacePermissionsInput = z.infer<typeof BulkReplacePermissionsSchema>;
