"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { readPatientForm, toFormState, type PatientFormState } from "@/lib/patient-form";

/**
 * Server Action: updatePatientAction
 *
 * Bound to a patient id by the edit page. Sends the form to
 * PATCH /api/patients/[id]; empty optional fields are sent as null, which
 * clears them.
 */
export async function updatePatientAction(
  patientId: string,
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const response = await sendApiJson(API_PATHS.patients.detail(patientId), "PATCH", readPatientForm(formData));

  if (response?.ok) {
    revalidatePath(PATHS.patients.list());
    revalidatePath(PATHS.patients.detail(patientId));
    redirect(PATHS.patients.detail(patientId, { updated: 1 }));
  }
  return toFormState(response);
}
