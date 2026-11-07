"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

export type DeletePatientDocumentResult = { error?: string };

/**
 * Server Action: deletePatientDocumentAction
 *
 * Calls DELETE /api/patients/[id]/documents/[documentId] (checks can_delete
 * on "Patients") and refreshes the patient's page.
 */
export async function deletePatientDocumentAction(
  patientId: string,
  documentId: string
): Promise<DeletePatientDocumentResult> {
  const response = await sendApiJson(API_PATHS.patients.document(patientId, documentId), "DELETE");
  if (!response) return { error: "Network error — please try again." };

  if (response.status === 204 || response.status === 404) {
    revalidatePath(PATHS.patients.detail(patientId));
    return {};
  }

  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not delete this document. Please try again." };
}
