import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "../../../../../repository/patient-repository";
import { MedicalHistoryRepository } from "../../../../../repository/patient-repository";
import { MedicalHistoryUpsertSchema } from "../../../../../types/patients";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
} from "../../../../../services/api-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/patients/[id]/medical-history
 *
 * Returns the shared medical history for a patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   200  { medicalHistory: MedicalHistoryModel }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or medical history not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate();
  if (error) return error;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 });
  }

  // Verify patient exists
  const patient = await PatientRepository.findById(id);
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(session!.user.role, session!.user.clinic_id, patient.clinic_id);
  if (accessError) return accessError;

  const medicalHistory = await MedicalHistoryRepository.findByPatientId(id);
  if (!medicalHistory) {
    return NextResponse.json({ error: "Medical history not found" }, { status: 404 });
  }

  return NextResponse.json({ medicalHistory }, { status: 200 });
}

/**
 * PUT /api/patients/[id]/medical-history
 *
 * Creates or fully replaces the shared medical history for a patient (upsert).
 * The record is 1:1 with the patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Body: MedicalHistoryUpsertSchema fields
 *
 * Responses:
 *   200  { medicalHistory: MedicalHistoryModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient not found
 *   422  Validation error
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

  const parsed = MedicalHistoryUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const medicalHistory = await MedicalHistoryRepository.upsert(id, parsed.data);
  return NextResponse.json({ medicalHistory }, { status: 200 });
}

/**
 * DELETE /api/patients/[id]/medical-history
 *
 * Deletes the shared medical history record for a patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Patient or medical history not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
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

  const deleted = await MedicalHistoryRepository.deleteByPatientId(id);
  if (!deleted) {
    return NextResponse.json({ error: "Medical history not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
