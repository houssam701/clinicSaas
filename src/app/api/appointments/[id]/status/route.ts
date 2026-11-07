import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentStatus, AppointmentStatusUpdateSchema } from "@/types/appointments";
import { authorizeAppointment } from "@/services/appointment-rules";

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
 * Authorization: SuperAdmin, or Admin/Staff with can_edit on "Appointments" (own clinic)
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
  const { id } = await context.params;
  const { appointment, error } = await authorizeAppointment(id, "can_edit");
  if (error) return error;

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
