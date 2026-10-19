import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "../../../../../repository/patient-repository";
import { PatientDocumentRepository } from "../../../../../repository/patient-repository";
import {
  CreatePatientDocumentSchema,
  ListDocumentsQuerySchema,
} from "../../../../../types/patients";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
} from "../../../../../services/api-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/patients/[id]/documents
 *
 * Returns a paginated list of documents for a patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Query Params:
 *   page?:          number (min 1, default 1)
 *   limit?:         number (min 1, max 200, default 20)
 *   document_type?: string
 *
 * Responses:
 *   200  { data: PatientDocumentModel[], total: number, page: number, limit: number }
 *   400  Invalid UUID / query params
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }

  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

  // Parse query params
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
  const result = await PatientDocumentRepository.findAll(id, { page, limit, document_type });

  return NextResponse.json(
    { data: result.data, total: result.total, page, limit },
    { status: 200 }
  );
}

/**
 * POST /api/patients/[id]/documents
 *
 * Attaches a document to a patient.
 * Accepts a JSON body with { name, file_url, document_type? }.
 * (multipart/form-data upload handling would be added at the infrastructure layer.)
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Body: CreatePatientDocumentSchema fields
 *
 * Responses:
 *   201  { document: PatientDocumentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 *   422  Validation error
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }

  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

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

  const document = await PatientDocumentRepository.create({
    patient_id:    id,
    name:          parsed.data.name,
    file_url:      parsed.data.file_url,
    document_type: parsed.data.document_type,
  });

  return NextResponse.json({ document }, { status: 201 });
}
