/**
 * Shared helpers for the patient forms: the patient itself (create and edit),
 * its medical history and its documents.
 *
 * Kept out of the "use server" action files on purpose: every export of a
 * "use server" module becomes a server action the browser can call, so plain
 * helpers belong here.
 */

export type PatientFormField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "date_of_birth"
  | "gender";

export type MedicalHistoryFormField =
  | "blood_type"
  | "allergies"
  | "chronic_conditions"
  | "current_medications";

export type DocumentFormField = "name" | "file_url" | "document_type";

/** Form state shared by every patient form; `saved` changes on each success. */
export type FormState<F extends string> = {
  error?: string;
  fieldErrors?: Partial<Record<F, string[]>>;
  saved?: number;
};

export type PatientFormState = FormState<PatientFormField>;
export type MedicalHistoryFormState = FormState<MedicalHistoryFormField>;
export type DocumentFormState = FormState<DocumentFormField>;

const reader = (formData: FormData) => (name: string) =>
  ((formData.get(name) as string | null) ?? "").trim();

/**
 * Reads the patient form. Empty optional fields are null, which clears them on
 * edit; on create the action drops them instead (see omitEmpty).
 */
export function readPatientForm(formData: FormData) {
  const text = reader(formData);
  const optional = (name: PatientFormField) => text(name) || null;
  return {
    first_name:    text("first_name"),
    last_name:     text("last_name"),
    email:         optional("email"),
    phone:         optional("phone"),
    date_of_birth: optional("date_of_birth"),
    gender:        optional("gender"),
  };
}

/** Reads the medical history form; empty fields are null (cleared). */
export function readMedicalHistoryForm(formData: FormData) {
  const text = reader(formData);
  const optional = (name: MedicalHistoryFormField) => text(name) || null;
  return {
    blood_type:          optional("blood_type"),
    allergies:           optional("allergies"),
    chronic_conditions:  optional("chronic_conditions"),
    current_medications: optional("current_medications"),
  };
}

/** Reads the add-document form; an empty type is left out. */
export function readDocumentForm(formData: FormData) {
  const text = reader(formData);
  return {
    name:          text("name"),
    file_url:      text("file_url"),
    document_type: text("document_type") || undefined,
  };
}

/** Drops null fields, for creates where "empty" simply means "not given". */
export function omitEmpty<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined));
}

/**
 * Maps a failed /api/patients/** response (or null for a network error) to
 * form errors. `notFound` is the message for a 404 (the patient or document
 * was removed meanwhile).
 */
export async function toFormState<F extends string>(
  response: Response | null,
  notFound = "This patient no longer exists."
): Promise<FormState<F>> {
  if (!response) return { error: "Network error — please try again." };

  const data: { error?: string; details?: { fieldErrors?: FormState<F>["fieldErrors"]; formErrors?: string[] } } =
    await response.json().catch(() => ({}));

  switch (response.status) {
    case 400:
    case 422:
      if (data.details?.fieldErrors && Object.keys(data.details.fieldErrors).length > 0) {
        return { error: "Please fix the highlighted fields.", fieldErrors: data.details.fieldErrors };
      }
      return { error: data.details?.formErrors?.[0] ?? data.error ?? "Please check the form and try again." };
    case 401:
      return { error: "Your session has expired. Please sign in again." };
    case 403:
      // e.g. "Forbidden: You do not have 'can_edit' permission on 'Patients'"
      return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "You are not allowed to do this." };
    case 404:
      return { error: notFound };
    default:
      return { error: data.error ?? "Something went wrong. Please try again." };
  }
}
