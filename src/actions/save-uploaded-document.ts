"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState, type DocumentFormState } from "@/lib/patient-form";

/**
 * Server Action: saveUploadedDocumentAction
 *
 * Step 2 of an upload, after the browser PUT the file to storage. Sends the
 * storage key to POST /api/patients/[id]/documents, which checks the stored
 * file before saving the document.
 */
export async function saveUploadedDocumentAction(
  patientId: string,
  input: { name: string; document_type?: string; storage_key: string; file_name: string }
): Promise<DocumentFormState> {
  const response = await sendApiJson(API_PATHS.patients.documents(patientId), "POST", {
    ...input,
    document_type: input.document_type || undefined,
  });

  if (response?.status === 201) {
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  const state = await toFormState<"name" | "storage_key" | "file_name">(response);
  // A storage_key error (missing, too large, wrong type) is about the file itself
  const fileError = state.fieldErrors?.storage_key?.[0] ?? state.fieldErrors?.file_name?.[0];
  return {
    error: fileError ?? state.error,
    fieldErrors: state.fieldErrors?.name ? { name: state.fieldErrors.name } : undefined,
  };
}
