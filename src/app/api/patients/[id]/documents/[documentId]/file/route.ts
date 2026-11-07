import { NextRequest, NextResponse } from "next/server";
import { PatientDocumentRepository } from "@/repository/patient-repository";
import { UUID_REGEX } from "@/services/api-guard";
import { authorizePatient, storageUnavailable } from "@/services/patient-access";
import { getFileStorage } from "@/services/storage";
import { DOWNLOAD_URL_TTL_SECONDS } from "@/config/documents";

interface RouteContext {
  params: Promise<{ id: string; documentId: string }>;
}

/**
 * GET /api/patients/[id]/documents/[documentId]/file[?download=1]
 *
 * Opens a document. The browser follows this link directly (it sends the
 * session cookie), the access checks run, and it is redirected to:
 *   - an upload: a link to the private bucket valid for DOWNLOAD_URL_TTL_SECONDS,
 *     shown in the browser, or saved under its original name with ?download=1
 *   - a link document: its http(s) URL
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Patients" (scoped to their clinic)
 *
 * Responses:
 *   302  Redirect to the file
 *   400  Invalid UUID(s)
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or document not found
 *   503  File storage unavailable
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id, documentId } = await context.params;
  const { error } = await authorizePatient(id, "can_view");
  if (error) return error;

  if (!UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
  }
  const document = await PatientDocumentRepository.findById(documentId);
  if (!document || document.patient_id !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const noStore = { "Cache-Control": "private, no-store" };

  if (document.storage_key) {
    try {
      const url = await getFileStorage().createDownloadUrl({
        key: document.storage_key,
        fileName: document.file_name ?? document.name,
        contentType: document.mime_type ?? undefined,
        disposition: request.nextUrl.searchParams.get("download") ? "attachment" : "inline",
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      });
      return NextResponse.redirect(url, { status: 302, headers: noStore });
    } catch (e) {
      return storageUnavailable(e);
    }
  }

  // Link documents were validated as http(s) when saved; check again before redirecting
  if (document.file_url && /^https?:\/\//i.test(document.file_url)) {
    return NextResponse.redirect(document.file_url, { status: 302, headers: noStore });
  }
  return NextResponse.json({ error: "Document has no file" }, { status: 404 });
}
