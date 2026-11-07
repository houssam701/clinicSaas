"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { omitEmpty, readPatientForm, toFormState, type PatientFormState } from "@/lib/patient-form";
import type { PatientModel } from "@/types/patients";

/**
 * Server Action: createPatientAction
 *
 * Sends the form to POST /api/patients (the API puts the patient in the
 * caller's own clinic and checks can_create on "Patients"), then opens the
 * new patient's page.
 */
export async function createPatientAction(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const response = await sendApiJson(API_PATHS.patients.list(), "POST", omitEmpty(readPatientForm(formData)));

  if (response?.status === 201) {
    const { patient }: { patient: PatientModel } = await response.json();
    revalidatePath(PATHS.patients.list());
    redirect(PATHS.patients.detail(patient.id, { created: 1 }));
  }
  return toFormState(response);
}
