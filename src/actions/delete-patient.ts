"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

export type DeletePatientResult = { error?: string };

/**
 * Server Action: deletePatientAction
 *
 * Calls DELETE /api/patients/[id] (checks can_delete on "Patients").
 * The patient is soft-deleted; the list is revalidated so the row disappears.
 */
export async function deletePatientAction(patientId: string): Promise<DeletePatientResult> {
  const response = await sendApiJson(API_PATHS.patients.detail(patientId), "DELETE");
  if (!response) return { error: "Network error — please try again." };

  if (response.status === 204 || response.status === 404) {
    // 404: already gone, which is the outcome the user wanted
    revalidatePath(PATHS.patients.list());
    return {};
  }

  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not delete this patient. Please try again." };
}
