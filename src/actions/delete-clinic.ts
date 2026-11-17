"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

export type DeleteClinicResult = { error?: string };

/**
 * Server Action: deleteClinicAction
 *
 * Calls DELETE /api/clinics/[id], which also removes the clinic's users,
 * patients, appointments and invoices. On success the clinics and users
 * lists are revalidated, so the row disappears without a page reload.
 */
export async function deleteClinicAction(clinicId: string): Promise<DeleteClinicResult> {
  const response = await sendApiJson(API_PATHS.clinics.detail(clinicId), "DELETE");
  if (!response) return { error: "Network error — please try again." };

  if (response.status === 204 || response.status === 404) {
    // 404: already gone, which is the outcome the user wanted
    revalidatePath(PATHS.platform.clinics.list());
    revalidatePath(PATHS.platform.users.list());
    return {};
  }

  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error ?? "Could not delete this clinic. Please try again." };
}
