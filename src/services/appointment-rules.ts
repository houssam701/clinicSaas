import { NextResponse } from "next/server";
import { PatientRepository } from "../repository/patient-repository";
import { AppointmentRepository } from "../repository/appointment-repository";
import { UUID_REGEX, authenticateForModule, canAccessClinic, type AuthenticatedSession } from "./api-guard";
import type { PermissionAction } from "../config/permissions";
import type { AppointmentWithPeople } from "../types/appointments";

const fieldError = (field: string, message: string) =>
  NextResponse.json({ error: "Validation failed", details: { fieldErrors: { [field]: [message] } } }, { status: 422 });

/**
 * The patient must belong to the appointment's clinic, and the person it is
 * with must be an Admin of that clinic (Staff never hold appointments), so no
 * one can book a patient or a team member of another clinic. Returns a 422,
 * or null when both are fine.
 */
export async function checkAppointmentPeople(opts: {
  clinicId: string;
  patientId?: string;
  userId?: string | null;
}): Promise<NextResponse | null> {
  const [patientOk, staffOk] = await Promise.all([
    opts.patientId ? PatientRepository.belongsToClinic(opts.patientId, opts.clinicId) : true,
    opts.userId ? AppointmentRepository.isClinicProvider(opts.userId, opts.clinicId) : true,
  ]);
  if (!patientOk) return fieldError("patient_id", "This patient is not in this clinic.");
  if (!staffOk) return fieldError("user_id", "Appointments can only be with an admin of this clinic.");
  return null;
}

/** 409 when the assigned staff member is already booked in this slot. */
export async function checkAppointmentConflict(opts: {
  userId?: string | null;
  scheduledTime: string;
  durationMinutes: number;
  excludeId?: string;
}): Promise<NextResponse | null> {
  if (!opts.userId) return null;
  const conflict = await AppointmentRepository.hasConflict({
    user_id: opts.userId,
    scheduled_time: opts.scheduledTime,
    duration_minutes: opts.durationMinutes,
    exclude_id: opts.excludeId,
  });
  if (!conflict) return null;
  return NextResponse.json(
    {
      error: "Scheduling conflict: the assigned staff member already has an appointment in this time slot",
      details: { fieldErrors: { scheduled_time: ["This staff member is already booked at this time."] } },
    },
    { status: 409 }
  );
}

export type AppointmentAccess =
  | { session: AuthenticatedSession; appointment: AppointmentWithPeople; error: null }
  | { session: null; appointment: null; error: NextResponse };

/**
 * The checks every /api/appointments/[id]/** handler starts with: signed in,
 * `action` on "Appointments" (the SuperAdmin skips it), a valid id, an
 * existing appointment, and the caller's own clinic.
 */
export async function authorizeAppointment(id: string, action: PermissionAction): Promise<AppointmentAccess> {
  const fail = (error: NextResponse): AppointmentAccess => ({ session: null, appointment: null, error });

  const { session, error } = await authenticateForModule("Appointments", action);
  if (error) return fail(error);

  if (!UUID_REGEX.test(id)) {
    return fail(NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 }));
  }
  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) return fail(NextResponse.json({ error: "Appointment not found" }, { status: 404 }));

  const accessError = canAccessClinic(
    session.user.role,
    session.user.clinic_id,
    appointment.clinic_id,
    "Forbidden: Appointment belongs to a different clinic"
  );
  if (accessError) return fail(accessError);

  return { session, appointment, error: null };
}
