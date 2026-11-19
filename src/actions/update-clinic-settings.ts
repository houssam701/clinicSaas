"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { readClinicForm, toClinicFormState, type ClinicFormState } from "@/lib/clinic-form";

/**
 * Server Action: updateClinicSettingsAction
 *
 * An Admin saves their own clinic's name, time zone and currency through
 * PATCH /api/clinic. Every page shows the clinic name, times and amounts,
 * so the whole layout is revalidated.
 */
export async function updateClinicSettingsAction(_prev: ClinicFormState, formData: FormData): Promise<ClinicFormState> {
  const { name, timezone, currency } = readClinicForm(formData);
  const response = await sendApiJson(API_PATHS.myClinic, "PATCH", { name, timezone, currency });

  if (response?.ok) {
    revalidatePath(PATHS.dashboard, "layout");
    redirect(PATHS.settings({ saved: 1 }));
  }
  if (response?.status === 403) return { error: "You can view the clinic settings but not change them." };
  return toClinicFormState(response);
}
