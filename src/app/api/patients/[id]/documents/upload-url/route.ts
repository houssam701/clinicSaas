import { NextRequest, NextResponse } from "next/server";
import { RequestDocumentUploadSchema } from "@/types/patients";
import { UPLOAD_URL_TTL_SECONDS, extensionFor, patientDocumentsPrefix } from "@/config/documents";
import { authorizePatient, storageUnavailable } from "@/services/patient-access";
import { getFileStorage } from "@/services/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/patients/[id]/documents/upload-url
 *
 * Step 1 of uploading a document. Returns a short-lived link the browser PUTs
 * the file to directly (the file never passes through this server). Step 2 is
 * POST /api/patients/[id]/documents with the returned storage_key, which
 * checks the stored file and saves the document.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Patients" (scoped to their clinic)
 *
 * Body: { file_name: string, mime_type: allowed type, size_bytes: number (≤ MAX_DOCUMENT_BYTES) }
 *
 * Responses:
 *   200  { upload_url, storage_key, headers: { "Content-Type" }, expires_in }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 *   422  Validation error (file type or size)
 *   503  File storage unavailable
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { patient, error } = await authorizePatient(id, "can_create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = RequestDocumentUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // A random key inside the patient's folder; the original name is kept in the database
  const storage_key = `${patientDocumentsPrefix(patient.clinic_id, patient.id)}${crypto.randomUUID()}.${extensionFor(parsed.data.mime_type)}`;

  try {
    const upload_url = await getFileStorage().createUploadUrl({
      key: storage_key,
      contentType: parsed.data.mime_type,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    });
    return NextResponse.json(
      {
        upload_url,
        storage_key,
        headers: { "Content-Type": parsed.data.mime_type },
        expires_in: UPLOAD_URL_TTL_SECONDS,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return storageUnavailable(e);
  }
}
