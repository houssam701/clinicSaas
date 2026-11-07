"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { readMedicalHistoryForm, toFormState, type MedicalHistoryFormState } from "@/lib/patient-form";

/**
 * Server Action: updateMedicalHistoryAction
 *
 * Bound to a patient id. Replaces the patient's medical history through
 * PUT /api/patients/[id]/medical-history (checks can_edit on "Patients");
 * empty fields are cleared.
 */
export async function updateMedicalHistoryAction(
  patientId: string,
  _prevState: MedicalHistoryFormState,
  formData: FormData
): Promise<MedicalHistoryFormState> {
  const response = await sendApiJson(
    API_PATHS.patients.medicalHistory(patientId),
    "PUT",
    readMedicalHistoryForm(formData)
  );

  if (response?.ok) {
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  return toFormState(response);
}
