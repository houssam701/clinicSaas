import { z } from "../lib/zod";
import { PaginationQuerySchema } from "./pagination";
import type { FieldOutputTypes } from "../prisma/generated/contract";
import { isValidCurrency, isValidTimeZone } from "../lib/time-zone";

/** An IANA time zone such as "Asia/Beirut". */
const TimeZoneSchema = z.string().trim().refine(isValidTimeZone, "Choose a valid time zone.");

/** An ISO 4217 currency code such as "USD". */
const CurrencySchema = z.string().trim().toUpperCase().refine(isValidCurrency, "Choose a valid currency.");

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
  timezone: TimeZoneSchema.default("UTC"),
  currency: CurrencySchema.default("USD"),
});

export const UpdateClinicSchema = z
  .object({
    name: z.string().trim().min(1, "Clinic name is required.").optional(),
    clinic_type: z
      .nativeEnum(ClinicType, {
        message: "Clinic type must be Dentistry or Therapy.",
      })
      .optional(),
    timezone: TimeZoneSchema.optional(),
    currency: CurrencySchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.clinic_type !== undefined || data.timezone !== undefined || data.currency !== undefined,
    { message: "Provide a clinic name, type, time zone or currency to update." }
  );

// PATCH /api/clinic: an Admin updates their own clinic. The type is not here:
// it decides which clinical fields exist, so only the SuperAdmin changes it.
export const ClinicSettingsSchema = z
  .object({
    name: z.string().trim().min(1, "Clinic name is required.").max(120, "Use at most 120 characters.").optional(),
    timezone: TimeZoneSchema.optional(),
    currency: CurrencySchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.timezone !== undefined || d.currency !== undefined, {
    message: "Provide a clinic name, time zone or currency to update.",
  });

export const DeleteClinicSchema = z.object({
  id: z.string().uuid("Clinic is not a valid ID."),
});

export const ListClinicsQuerySchema = PaginationQuerySchema.extend({
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
  timezone: string;
  currency: string;
};

export type UpdateClinicData = {
  name?: string;
  clinic_type?: ClinicType;
  timezone?: string;
  currency?: string;
};
