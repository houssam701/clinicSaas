import { z } from "../lib/zod";
import { PaginationQuerySchema } from "./pagination";
import type { FieldOutputTypes } from "../prisma/generated/contract";
import type { JsonValue } from "@prisma/orm-postgres/utils/json";

// ─── DB Models — derived directly from Prisma 8 generated contract ────────────
export type PatientModel          = FieldOutputTypes["public"]["Patient"];
export type MedicalHistoryModel   = FieldOutputTypes["public"]["SharedMedicalHistory"];
export type PatientDocumentModel  = FieldOutputTypes["public"]["PatientDocument"];

// ─── Choices offered by the forms ─────────────────────────────────────────────
export const GENDER_OPTIONS = ["Female", "Male", "Other"] as const;

export const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  "Lab result",
  "X-ray / Imaging",
  "Prescription",
  "Referral",
  "Consent form",
  "Other",
] as const;

// ─── Patient Schemas ──────────────────────────────────────────────────────────

/** A calendar date (YYYY-MM-DD) that is not in the future. */
const DateOfBirthSchema = z.iso
  .date()
  .refine((d) => d <= new Date().toISOString().slice(0, 10), "Date of birth cannot be in the future.");

/**
 * clinic_id is only read for the SuperAdmin; Admin and Staff always create
 * patients in their own clinic (taken from their session).
 */
export const CreatePatientSchema = z.object({
  clinic_id:        z.string().uuid("Please select a valid clinic.").optional(),
  first_name:       z.string().trim().min(1, "First name is required."),
  last_name:        z.string().trim().min(1, "Last name is required."),
  email:            z.string().email("Enter a valid email address.").optional(),
  phone:            z.string().trim().min(1).optional(),
  date_of_birth:    DateOfBirthSchema.optional(),
  gender:           z.string().optional(),
  specialized_data: z.unknown().optional(),
});

/** Optional fields accept null, which clears them. */
export const UpdatePatientSchema = z
  .object({
    first_name:       z.string().trim().min(1, "First name is required.").optional(),
    last_name:        z.string().trim().min(1, "Last name is required.").optional(),
    email:            z.string().email("Enter a valid email address.").nullable().optional(),
    phone:            z.string().trim().min(1).nullable().optional(),
    date_of_birth:    DateOfBirthSchema.nullable().optional(),
    gender:           z.string().nullable().optional(),
    specialized_data: z.unknown().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Change at least one field before saving.",
  });

export const ListPatientsQuerySchema = PaginationQuerySchema.extend({
  clinic_id: z.string().uuid().optional(),
  search:    z.string().trim().optional(),
});

// ─── Medical History Schemas ──────────────────────────────────────────────────

/** Replaces the whole record; null (or a missing field) clears that field. */
export const MedicalHistoryUpsertSchema = z.object({
  blood_type:          z.string().nullable().optional(),
  allergies:           z.string().nullable().optional(),
  chronic_conditions:  z.string().nullable().optional(),
  current_medications: z.string().nullable().optional(),
});

// ─── Patient Document Schemas ─────────────────────────────────────────────────

/** Only http(s) links: the URL becomes an <a href>, so "javascript:" etc. are refused. */
const FileUrlSchema = z.url({
  protocol: /^https?$/,
  error: "File URL must be a valid http(s) link (e.g. https://...).",
});

export const CreatePatientDocumentSchema = z.object({
  name:          z.string().trim().min(1, "Document name is required."),
  file_url:      FileUrlSchema,
  document_type: z.string().optional(),
});

export const UpdatePatientDocumentSchema = z
  .object({
    name:          z.string().trim().min(1).optional(),
    file_url:      FileUrlSchema.optional(),
    document_type: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Change at least one field before saving.",
  });

export const ListDocumentsQuerySchema = PaginationQuerySchema.extend({
  document_type: z.string().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreatePatientInput        = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput        = z.infer<typeof UpdatePatientSchema>;
export type ListPatientsQueryInput    = z.infer<typeof ListPatientsQuerySchema>;
export type MedicalHistoryUpsertInput = z.infer<typeof MedicalHistoryUpsertSchema>;
export type CreateDocumentInput       = z.infer<typeof CreatePatientDocumentSchema>;
export type UpdateDocumentInput       = z.infer<typeof UpdatePatientDocumentSchema>;
export type ListDocumentsQueryInput   = z.infer<typeof ListDocumentsQuerySchema>;

// ─── Mutable data shapes passed to the repository ────────────────────────────
export type CreatePatientData = {
  clinic_id:         string;
  first_name:        string;
  last_name:         string;
  email?:            string;
  phone?:            string;
  date_of_birth?:    string;
  gender?:           string;
  specialized_data?: JsonValue;
};

export type UpdatePatientData = {
  first_name?:       string;
  last_name?:        string;
  email?:            string | null;
  phone?:            string | null;
  date_of_birth?:    string | null;
  gender?:           string | null;
  specialized_data?: JsonValue;
};

export type MedicalHistoryData = {
  blood_type?:          string | null;
  allergies?:           string | null;
  chronic_conditions?:  string | null;
  current_medications?: string | null;
};

export type CreateDocumentData = {
  patient_id:     string;
  name:           string;
  file_url:       string;
  document_type?: string;
};

export type UpdateDocumentData = {
  name?:          string;
  file_url?:      string;
  document_type?: string;
};
