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

// Admin can only create Staff — role is locked at the schema level
export const CreateStaffSchema = CreateUserSchema.extend({
  role: z.literal(UserRole.Staff),
});

// ─── Inferred Request Types ───────────────────────────────────────────────────
export type LoginInput       = z.infer<typeof LoginSchema>;
export type CreateUserInput  = z.infer<typeof CreateUserSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
