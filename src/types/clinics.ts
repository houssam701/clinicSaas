import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── Enum ─────────────────────────────────────────────────────────────────────
// Matches contract.prisma ClinicType enum and Prisma 8 generated types
export enum ClinicType {
  Dentistry = "Dentistry",
  Therapy   = "Therapy",
}

// ─── DB Model — derived directly from Prisma 8 generated contract ─────────────
// Guarantees the types always match what the ORM emits.
export type ClinicModel = FieldOutputTypes["public"]["Clinic"];

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const CreateClinicSchema = z.object({
  name: z.string().trim().min(1, "Clinic name cannot be empty"),
  clinic_type: z.nativeEnum(ClinicType, {
    message: "Clinic type must be either 'Dentistry' or 'Therapy'",
  }),
});

export const UpdateClinicSchema = z
  .object({
    name: z.string().trim().min(1, "Clinic name cannot be empty").optional(),
    clinic_type: z
      .nativeEnum(ClinicType, {
        message: "Clinic type must be either 'Dentistry' or 'Therapy'",
      })
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.clinic_type !== undefined,
    { message: "At least one field ('name' or 'clinic_type') must be provided for update" }
  );

export const DeleteClinicSchema = z.object({
  id: z.string().uuid("Invalid clinic ID format"),
});

export const ListClinicsQuerySchema = z.object({
  clinic_type: z.nativeEnum(ClinicType).optional(),
  search: z.string().trim().min(1).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateClinicInput = z.infer<typeof CreateClinicSchema>;
export type UpdateClinicInput = z.infer<typeof UpdateClinicSchema>;
export type DeleteClinicInput = z.infer<typeof DeleteClinicSchema>;
export type ListClinicsQueryInput = z.infer<typeof ListClinicsQuerySchema>;

export type CreateClinicData = {
  name: string;
  clinic_type: ClinicType;
};

export type UpdateClinicData = {
  name?: string;
  clinic_type?: ClinicType;
};
