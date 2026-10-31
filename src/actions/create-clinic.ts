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
 * Server Action: createClinicAction
 *
 * Posts the clinic form to POST /api/clinics (SuperAdmin only), then redirects
 * back to the clinics list or returns the API's validation errors.
 */
export async function createClinicAction(
  _prevState: ClinicFormState,
  formData: FormData
): Promise<ClinicFormState> {
  const response = await sendApiJson(API_PATHS.clinics.list(), "POST", readClinicForm(formData));

  if (response?.status === 201) {
    revalidatePath(PATHS.platform.clinics.list());
    redirect(PATHS.platform.clinics.list({ created: 1 }));
  }
  return toClinicFormState(response);
}
