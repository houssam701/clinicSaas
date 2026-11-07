import { z } from "../lib/zod";
import { PaginationQuerySchema } from "./pagination";
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, formatBytes } from "../config/documents";
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

/** Step 1 of an upload: ask for a link to PUT the file to. */
export const RequestDocumentUploadSchema = z.object({
  file_name: z.string().trim().min(1, "Choose a file to upload.").max(255, "File name must be at most 255 characters."),
  mime_type: z.enum(DOCUMENT_MIME_TYPES, { error: "This file type is not allowed." }),
  size_bytes: z
    .number()
    .int()
    .positive("The file is empty.")
    .max(MAX_DOCUMENT_BYTES, `Files can be at most ${formatBytes(MAX_DOCUMENT_BYTES)}.`),
});

/**
 * A document is either a link (file_url) or an uploaded file (storage_key from
 * step 1, plus its original file_name). Exactly one of the two is required.
 */
export const CreatePatientDocumentSchema = z
  .object({
    name:          z.string().trim().min(1, "Document name is required."),
    document_type: z.string().optional(),
    file_url:      FileUrlSchema.optional(),
    storage_key:   z.string().min(1).optional(),
    file_name:     z.string().trim().min(1).max(255).optional(),
  })
  .refine((d) => Boolean(d.file_url) !== Boolean(d.storage_key), {
    message: "Upload a file or paste a link.",
    path: ["file_url"],
  })
  .refine((d) => !d.storage_key || Boolean(d.file_name), {
    message: "File name is required for an upload.",
    path: ["file_name"],
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
export type RequestDocumentUploadInput = z.infer<typeof RequestDocumentUploadSchema>;
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
  document_type?: string;
  // A link…
  file_url?:      string;
  // …or an upload (values read back from the bucket, not from the client)
  storage_key?:   string;
  file_name?:     string;
  mime_type?:     string;
  size_bytes?:    number;
};

export type UpdateDocumentData = {
  name?:          string;
  file_url?:      string;
  document_type?: string;
};
