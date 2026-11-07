import { NextResponse } from "next/server";
import { PatientRepository } from "../repository/patient-repository";
import { UUID_REGEX, authenticateForModule, canAccessClinic, type AuthenticatedSession } from "./api-guard";
import type { PermissionAction } from "../config/permissions";
import type { PatientModel } from "../types/patients";

export type PatientAccess =
  | { session: AuthenticatedSession; patient: PatientModel; error: null }
  | { session: null; patient: null; error: NextResponse };

const fail = (error: NextResponse): PatientAccess => ({ session: null, patient: null, error });

/**
 * The checks every /api/patients/[id]/** handler starts with: signed in,
 * `action` on "Patients" (the SuperAdmin skips it), a valid id, an existing
 * patient, and the caller's own clinic.
 *
 * @example
 *   const { session, patient, error } = await authorizePatient(id, "can_view");
 *   if (error) return error;
 */
export async function authorizePatient(patientId: string, action: PermissionAction): Promise<PatientAccess> {
  const { session, error } = await authenticateForModule("Patients", action);
  if (error) return fail(error);

  if (!UUID_REGEX.test(patientId)) {
    return fail(NextResponse.json({ error: "Invalid patient ID format" }, { status: 400 }));
  }

  const patient = await PatientRepository.findById(patientId);
  if (!patient) return fail(NextResponse.json({ error: "Patient not found" }, { status: 404 }));

  const accessError = canAccessClinic(session.user.role, session.user.clinic_id, patient.clinic_id);
  if (accessError) return fail(accessError);

  return { session, patient, error: null };
}

/** 503 when file storage is not configured or the provider is unreachable. */
export function storageUnavailable(error: unknown): NextResponse {
  console.error("[storage]", error);
  return NextResponse.json(
    { error: "File storage is unavailable right now. Please try again later." },
    { status: 503 }
  );
}
