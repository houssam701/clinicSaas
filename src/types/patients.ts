import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";
import type { JsonValue } from "@prisma/orm-postgres/utils/json";

// ─── DB Models — derived directly from Prisma 8 generated contract ────────────
export type PatientModel          = FieldOutputTypes["public"]["Patient"];
export type MedicalHistoryModel   = FieldOutputTypes["public"]["SharedMedicalHistory"];
export type PatientDocumentModel  = FieldOutputTypes["public"]["PatientDocument"];

// ─── Patient Schemas ──────────────────────────────────────────────────────────

export const CreatePatientSchema = z.object({
  clinic_id:        z.string().uuid("Invalid clinic_id format"),
  first_name:       z.string().min(1, "First name is required"),
  last_name:        z.string().min(1, "Last name is required"),
  email:            z.string().email("Invalid email").optional(),
  phone:            z.string().min(1).optional(),
  date_of_birth:    z.string().optional(), // DateString
  gender:           z.string().optional(),
  specialized_data: z.unknown().optional(),
});

export const UpdatePatientSchema = z
  .object({
    first_name:       z.string().min(1).optional(),
    last_name:        z.string().min(1).optional(),
    email:            z.string().email().optional(),
    phone:            z.string().min(1).optional(),
    date_of_birth:    z.string().optional(),
    gender:           z.string().optional(),
    specialized_data: z.unknown().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ListPatientsQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(20),
  clinic_id: z.string().uuid().optional(),
  search:    z.string().optional(),
});

// ─── Medical History Schemas ──────────────────────────────────────────────────

export const MedicalHistoryUpsertSchema = z.object({
  blood_type:          z.string().optional(),
  allergies:           z.string().optional(),
  chronic_conditions:  z.string().optional(),
  current_medications: z.string().optional(),
});

// ─── Patient Document Schemas ─────────────────────────────────────────────────

export const CreatePatientDocumentSchema = z.object({
  name:          z.string().min(1, "Document name is required"),
  file_url:      z.string().url("file_url must be a valid URL"),
  document_type: z.string().optional(),
});

export const UpdatePatientDocumentSchema = z
  .object({
    name:          z.string().min(1).optional(),
    file_url:      z.string().url().optional(),
    document_type: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ListDocumentsQuerySchema = z.object({
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(200).default(20),
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
  email?:            string;
  phone?:            string;
  date_of_birth?:    string;
  gender?:           string;
  specialized_data?: JsonValue;
};

export type MedicalHistoryData = {
  blood_type?:          string;
  allergies?:           string;
  chronic_conditions?:  string;
  current_medications?: string;
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
