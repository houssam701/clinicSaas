import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentStatus, UpdateAppointmentSchema } from "@/types/appointments";
import {
  authorizeAppointment,
  checkAppointmentConflict,
  checkAppointmentPeople,
} from "@/services/appointment-rules";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/appointments/[id]
 *
 * Returns one appointment with its patient and staff names.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Appointments" (own clinic)
 *
 * Responses:
 *   200  { appointment: AppointmentWithPeople }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { appointment, error } = await authorizeAppointment(id, "can_view");
  if (error) return error;
  return NextResponse.json({ appointment }, { status: 200 });
}

/**
 * PATCH /api/appointments/[id]
 *
 * Reschedules or edits an appointment. A new patient or staff member must
 * belong to the appointment's clinic; a scheduled appointment may not overlap
 * another one of the same staff member.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_edit on "Appointments" (own clinic)
 *
 * Body: UpdateAppointmentSchema fields (at least one required)
 *
 * Responses:
 *   200  { appointment: AppointmentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 *   409  Scheduling conflict
 *   422  Validation error
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { appointment, error } = await authorizeAppointment(id, "can_edit");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = UpdateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const peopleError = await checkAppointmentPeople({
    clinicId: appointment.clinic_id,
    patientId: parsed.data.patient_id,
    userId: parsed.data.user_id,
  });
  if (peopleError) return peopleError;

  // Only a scheduled appointment holds its slot
  if (appointment.status === AppointmentStatus.Scheduled) {
    const conflictError = await checkAppointmentConflict({
      userId: parsed.data.user_id !== undefined ? parsed.data.user_id : appointment.user_id,
      scheduledTime: parsed.data.scheduled_time ?? appointment.scheduled_time,
      durationMinutes: parsed.data.duration_minutes ?? appointment.duration_minutes,
      excludeId: id,
    });
    if (conflictError) return conflictError;
  }

  const updated = await AppointmentRepository.updateAppointment(id, parsed.data);
  return NextResponse.json({ appointment: updated }, { status: 200 });
}

/**
 * DELETE /api/appointments/[id]
 *
 * Deletes an appointment (linked invoices are kept and unlinked).
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_delete on "Appointments" (own clinic)
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { error } = await authorizeAppointment(id, "can_delete");
  if (error) return error;

  await AppointmentRepository.deleteAppointment(id);
  return new NextResponse(null, { status: 204 });
}
