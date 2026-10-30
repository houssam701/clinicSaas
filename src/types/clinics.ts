import { z } from "../lib/zod";
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
  name: z.string().trim().min(1, "Clinic name is required."),
  clinic_type: z.nativeEnum(ClinicType, {
    message: "Clinic type must be Dentistry or Therapy.",
  }),
});

export const UpdateClinicSchema = z
  .object({
    name: z.string().trim().min(1, "Clinic name is required.").optional(),
    clinic_type: z
      .nativeEnum(ClinicType, {
        message: "Clinic type must be Dentistry or Therapy.",
      })
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.clinic_type !== undefined,
    { message: "Provide a clinic name or clinic type to update." }
  );

export const DeleteClinicSchema = z.object({
  id: z.string().uuid("Clinic is not a valid ID."),
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
