import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "../../../../repository/patient-repository";
import type { JsonValue } from "@prisma/orm-postgres/utils/json";
import { UpdatePatientSchema } from "../../../../types/patients";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
} from "../../../../services/api-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/patients/[id]
 *
 * Returns a single patient by UUID.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   200  { patient: PatientModel }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
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

  return NextResponse.json({ patient }, { status: 200 });
}

/**
 * PATCH /api/patients/[id]
 *
 * Partially updates a patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Body: UpdatePatientSchema fields (at least one required)
 *
 * Responses:
 *   200  { patient: PatientModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 *   422  Validation error
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const parsed = UpdatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await PatientRepository.updatePatient(id, {
    ...parsed.data,
    specialized_data: parsed.data.specialized_data as JsonValue | undefined,
  });
  return NextResponse.json({ patient: updated }, { status: 200 });
}

/**
 * DELETE /api/patients/[id]
 *
 * Deletes a patient and all associated records in a transaction.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin (Admin scoped to their clinic)
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
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

  await PatientRepository.deletePatient(id);
  return new NextResponse(null, { status: 204 });
}
  