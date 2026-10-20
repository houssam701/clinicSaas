import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── Enum ─────────────────────────────────────────────────────────────────────
// String enum so values match what Prisma 8 stores/returns ('SuperAdmin' etc.)
export enum UserRole {
  SuperAdmin = "SuperAdmin",
  Admin      = "Admin",
  Staff      = "Staff",
}

// ─── DB Model — derived directly from Prisma 8 generated contract ─────────────
// This guarantees the types always match what the ORM actually returns.
// FieldOutputTypes['public']['User'] is the exact shape Prisma 8 emits on reads.
export type UsersModel = FieldOutputTypes["public"]["User"];

// ─── Safe public shape (password_hash is never sent to the client) ─────────────
export type PublicUser = Omit<UsersModel, "password_hash">;

// ─── Zod Schemas (used inside route.ts files only) ────────────────────────────
export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export const CreateUserSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(8),
  first_name: z.string().min(1),
  last_name:  z.string().min(1),
  role:       z.nativeEnum(UserRole),
  clinic_id:  z.string().uuid().optional(),
});

// Admin can only create Staff for their own clinic.
// Role is locked to "Staff" and clinic_id is omitted because the client cannot specify it;
// it is always injected securely from the calling Admin's verified session.
export const CreateStaffSchema = CreateUserSchema.omit({ clinic_id: true }).extend({
  role: z.literal(UserRole.Staff),
});

// ─── Update User Schema ────────────────────────────────────────────────────────
export const UpdateUserSchema = z.object({
  email:      z.string().email().optional(),
  password:   z.string().min(8).optional(),
  first_name: z.string().min(1).optional(),
  last_name:  z.string().min(1).optional(),
  role:       z.nativeEnum(UserRole).optional(),
  clinic_id:  z.string().uuid().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

// ─── Query Schema for listing users ───────────────────────────────────────────
export const ListUsersQuerySchema = z.object({
  clinic_id: z.string().uuid().optional(),
  role:      z.nativeEnum(UserRole).optional(),
});

// ─── Inferred Request Types ───────────────────────────────────────────────────
export type LoginInput          = z.infer<typeof LoginSchema>;
export type CreateUserInput     = z.infer<typeof CreateUserSchema>;
export type CreateStaffInput    = z.infer<typeof CreateStaffSchema>;
export type UpdateUserInput     = z.infer<typeof UpdateUserSchema>;
export type ListUsersQueryInput = z.infer<typeof ListUsersQuerySchema>;

export type UpdateUserData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: UserRole;
  clinic_id?: string | null;
  password_hash?: string;
};


