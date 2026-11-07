"use server";

import { sendApiJson } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import type { RequestDocumentUploadInput } from "@/types/patients";

export type DocumentUploadTicket = {
  upload_url: string;
  storage_key: string;
  headers: Record<string, string>;
};

export type RequestDocumentUploadResult = { ticket: DocumentUploadTicket; error?: undefined } | { ticket?: undefined; error: string };

/**
 * Server Action: requestDocumentUploadAction
 *
 * Step 1 of an upload. Asks POST /api/patients/[id]/documents/upload-url for
 * a short-lived link; the browser then PUTs the file straight to storage.
 */
export async function requestDocumentUploadAction(
  patientId: string,
  file: RequestDocumentUploadInput
): Promise<RequestDocumentUploadResult> {
  const response = await sendApiJson(API_PATHS.patients.documentUploadUrl(patientId), "POST", file);
  if (response?.ok) return { ticket: await response.json() };

  const state = await toFormState(response);
  const fieldError = Object.values(state.fieldErrors ?? {}).flat()[0] as string | undefined;
  return { error: fieldError ?? state.error ?? "Could not start the upload. Please try again." };
}
