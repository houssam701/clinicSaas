"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { readDocumentForm, toFormState, type DocumentFormState } from "@/lib/patient-form";

/**
 * Server Action: createPatientDocumentAction
 *
 * Bound to a patient id. Attaches a document link through
 * POST /api/patients/[id]/documents (checks can_create on "Patients").
 */
export async function createPatientDocumentAction(
  patientId: string,
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const response = await sendApiJson(API_PATHS.patients.documents(patientId), "POST", readDocumentForm(formData));

  if (response?.status === 201) {
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  return toFormState(response);
}
