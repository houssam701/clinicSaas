"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import {
  readClinicForm,
  toClinicFormState,
  type ClinicFormState,
} from "@/lib/clinic-form";

/**
 * Server Action: updateClinicAction
 *
 * Bound to a clinic id by the edit page. Sends the form to PATCH /api/clinics/[id].
 */
export async function updateClinicAction(
  clinicId: string,
  _prevState: ClinicFormState,
  formData: FormData
): Promise<ClinicFormState> {
  const response = await sendApiJson(
    API_PATHS.clinics.detail(clinicId),
    "PATCH",
    readClinicForm(formData)
  );

  if (response?.ok) {
    revalidatePath(PATHS.platform.clinics.list());
    redirect(PATHS.platform.clinics.list({ updated: 1 }));
  }
  return toClinicFormState(response);
}
