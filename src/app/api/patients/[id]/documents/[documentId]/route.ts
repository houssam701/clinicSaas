import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "../../../../../../repository/patient-repository";
import { PatientDocumentRepository } from "../../../../../../repository/patient-repository";
import { UpdatePatientDocumentSchema } from "../../../../../../types/patients";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
} from "../../../../../../services/api-guard";

interface RouteContext {
  params: Promise<{ id: string; documentId: string }>;
}

/**
 * GET /api/patients/[id]/documents/[documentId]
 *
 * Returns a specific patient document.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   200  { document: PatientDocumentModel }
 *   400  Invalid UUID(s)
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or document not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id, documentId } = await context.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }
  if (!UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
  }

  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

  const document = await PatientDocumentRepository.findById(documentId);
  if (!document || document.patient_id !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document }, { status: 200 });
}

/**
 * PATCH /api/patients/[id]/documents/[documentId]
 *
 * Updates metadata for a specific patient document (name, file_url, document_type).
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Body: UpdatePatientDocumentSchema fields (at least one required)
 *
 * Responses:
 *   200  { document: PatientDocumentModel }
 *   400  Invalid UUID(s) / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or document not found
 *   422  Validation error
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id, documentId } = await context.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }
  if (!UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
  }

  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

  const document = await PatientDocumentRepository.findById(documentId);
  if (!document || document.patient_id !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = UpdatePatientDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await PatientDocumentRepository.update(documentId, parsed.data);
  return NextResponse.json({ document: updated }, { status: 200 });
}

/**
 * DELETE /api/patients/[id]/documents/[documentId]
 *
 * Deletes a patient document.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID(s)
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or document not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id, documentId } = await context.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }
  if (!UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid document ID format" }, { status: 400 });
  }

  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

  const document = await PatientDocumentRepository.findById(documentId);
  if (!document || document.patient_id !== id) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await PatientDocumentRepository.delete(documentId);
  return new NextResponse(null, { status: 204 });
}
