import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { UserRole } from "@/types/users";
import { AppointmentStatus, AppointmentStatusUpdateSchema } from "@/types/appointments";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
  checkModulePermission,
} from "@/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Status values from which no further transitions are permitted. */
const TERMINAL_STATUSES = new Set<AppointmentStatus>([
  AppointmentStatus.Completed,
  AppointmentStatus.Canceled,
  AppointmentStatus.NoShow,
]);

/**
 * PATCH /api/appointments/[id]/status
 *
 * Updates only the status of an appointment
 * (e.g., mark as Completed, Canceled, or NoShow).
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_edit on "Appointments"
 *
 * Body:
 *   status: "Scheduled" | "Completed" | "Canceled" | "NoShow"
 *
 * Transition rules:
 *   - Once an appointment reaches a terminal status (Completed, Canceled,
 *     NoShow) it cannot be changed back to Scheduled or any other status.
 *
 * Responses:
 *   200  { appointment: AppointmentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden (wrong role or missing Staff permission)
 *   404  Not found
 *   422  Validation error or invalid status transition
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // All three roles can attempt a status update
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // Staff: require can_edit permission on "Appointments"
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

  // Enforce clinic boundary for Admin and Staff
  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    appointment.clinic_id,
    "Forbidden: Appointment belongs to a different clinic"
  );
  if (accessError) return accessError;

  // Parse & validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = AppointmentStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Guard against re-opening a terminal appointment
  const currentStatus = appointment.status as AppointmentStatus;
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status transition: appointment is already ${currentStatus} and cannot be changed`,
      },
      { status: 422 }
    );
  }

  const updated = await AppointmentRepository.updateStatus(id, { status: parsed.data.status });
  return NextResponse.json({ appointment: updated }, { status: 200 });
}
