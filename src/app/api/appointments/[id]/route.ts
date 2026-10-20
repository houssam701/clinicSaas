import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { UserRole } from "@/types/users";
import { UpdateAppointmentSchema } from "@/types/appointments";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
  checkModulePermission,
} from "@/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/appointments/[id]
 *
 * Returns a single appointment by UUID.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_view on "Appointments"
 *
 * Responses:
 *   200  { appointment: AppointmentModel }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // Staff permission check
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Appointments", "can_view");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 });
  }

  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    appointment.clinic_id,
    "Forbidden: Appointment belongs to a different clinic"
  );
  if (accessError) return accessError;

  return NextResponse.json({ appointment }, { status: 200 });
}

/**
 * PATCH /api/appointments/[id]
 *
 * Reschedules / partially updates an appointment.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_edit on "Appointments"
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
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // Staff permission check
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Appointments", "can_edit");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 });
  }

  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    appointment.clinic_id,
    "Forbidden: Appointment belongs to a different clinic"
  );
  if (accessError) return accessError;

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

  // Conflict check: only when rescheduling time or changing staff
  const newUserId   = parsed.data.user_id !== undefined ? parsed.data.user_id : appointment.user_id;
  const newTime     = parsed.data.scheduled_time   ?? appointment.scheduled_time;
  const newDuration = parsed.data.duration_minutes ?? appointment.duration_minutes;

  if (newUserId) {
    const conflict = await AppointmentRepository.hasConflict({
      user_id:          newUserId,
      scheduled_time:   newTime,
      duration_minutes: newDuration,
      exclude_id:       id,
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Scheduling conflict: the assigned staff member already has an appointment in this time slot" },
        { status: 409 }
      );
    }
  }

  const updated = await AppointmentRepository.updateAppointment(id, parsed.data);
  return NextResponse.json({ appointment: updated }, { status: 200 });
}

/**
 * DELETE /api/appointments/[id]
 *
 * Deletes an appointment.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_delete on "Appointments"
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // Staff permission check
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Appointments", "can_delete");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 });
  }

  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    appointment.clinic_id,
    "Forbidden: Appointment belongs to a different clinic"
  );
  if (accessError) return accessError;

  await AppointmentRepository.deleteAppointment(id);
  return new NextResponse(null, { status: 204 });
}
