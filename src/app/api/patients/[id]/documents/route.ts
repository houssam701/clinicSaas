import { NextRequest, NextResponse } from "next/server";
import { PatientDocumentRepository } from "@/repository/patient-repository";
import { CreatePatientDocumentSchema, ListDocumentsQuerySchema } from "@/types/patients";
import { MAX_DOCUMENT_BYTES, formatBytes, isAllowedMimeType, patientDocumentsPrefix } from "@/config/documents";
import { authorizePatient, storageUnavailable } from "@/services/patient-access";
import { deleteStoredFilesQuietly, getFileStorage } from "@/services/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const invalid = (field: string, message: string) =>
  NextResponse.json({ error: "Validation failed", details: { fieldErrors: { [field]: [message] } } }, { status: 422 });

/**
 * GET /api/patients/[id]/documents
 *
 * Returns a paginated list of documents for a patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Patients" (scoped to their clinic)
 *
 * Query Params:
 *   page?:          number (min 1, default 1)
 *   limit?:         number (min 1, max 200, default DEFAULT_PAGE_SIZE)
 *   document_type?: string
 *
 * Responses:
 *   200  { documents: PatientDocumentModel[], total: number, page: number, limit: number }
 *   400  Invalid UUID / query params
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { error } = await authorizePatient(id, "can_view");
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const parsed = ListDocumentsQuerySchema.safeParse({
    page:          sp.get("page")          ?? undefined,
    limit:         sp.get("limit")         ?? undefined,
    document_type: sp.get("document_type") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, document_type } = parsed.data;
  const result = await PatientDocumentRepository.findPage(id, { page, limit, document_type });

  return NextResponse.json(
    { documents: result.data, total: result.total, page, limit },
    { status: 200 }
  );
}

/**
 * POST /api/patients/[id]/documents
 *
 * Saves a document for a patient, in one of two forms:
 *   - a link:   { name, document_type?, file_url }   (http(s) only)
 *   - an upload: { name, document_type?, storage_key, file_name }, where
 *     storage_key comes from POST .../documents/upload-url and the file was
 *     already PUT to storage. The stored file is checked here (it exists, is
 *     in this patient's folder, has an allowed type and size); its size and
 *     type are read from storage, never trusted from the client.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Patients" (scoped to their clinic)
 *
 * Responses:
 *   201  { document: PatientDocumentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 *   409  This upload was already saved
 *   422  Validation error (incl. the uploaded file is missing, too large or of a wrong type)
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

  const parsed = CreatePatientDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { name, document_type, file_url, storage_key, file_name } = parsed.data;

  // A link to a file hosted elsewhere
  if (file_url) {
    const document = await PatientDocumentRepository.create({ patient_id: id, name, document_type, file_url });
    return NextResponse.json({ document }, { status: 201 });
  }

  // An upload: the key must be inside this patient's folder…
  const key = storage_key!;
  if (!key.startsWith(patientDocumentsPrefix(patient.clinic_id, patient.id)) || key.includes("..")) {
    return invalid("storage_key", "This upload does not belong to this patient.");
  }
  // …and saved only once
  if (await PatientDocumentRepository.storageKeyInUse(key)) {
    return NextResponse.json({ error: "This upload was already saved." }, { status: 409 });
  }

  let stored;
  try {
    stored = await getFileStorage().stat(key);
  } catch (e) {
    return storageUnavailable(e);
  }
  if (!stored) return invalid("storage_key", "The file was not uploaded. Please try again.");

  // The link only limits the type, not the size: check what actually arrived
  const tooLarge = stored.size > MAX_DOCUMENT_BYTES;
  const wrongType = !stored.contentType || !isAllowedMimeType(stored.contentType);
  if (tooLarge || wrongType || stored.size === 0) {
    await deleteStoredFilesQuietly([key], "rejected upload");
    return invalid(
      "storage_key",
      tooLarge
        ? `Files can be at most ${formatBytes(MAX_DOCUMENT_BYTES)}.`
        : wrongType
          ? "This file type is not allowed."
          : "The file is empty."
    );
  }

  const document = await PatientDocumentRepository.create({
    patient_id: id,
    name,
    document_type,
    storage_key: key,
    file_name,
    mime_type: stored.contentType,
    size_bytes: stored.size,
  });
  return NextResponse.json({ document }, { status: 201 });
}
