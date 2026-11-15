import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { UUID_REGEX, authenticateForModule, canAccessClinic } from "@/services/api-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/appointments/[id]/payments
 *
 * The money taken at one appointment: each payment (newest first) with the
 * treatment it went to. One patient's record, so "Finances" view is enough.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Finances";
 *                the appointment must be in the caller's clinic
 *
 * Responses:
 *   200  { payments: VisitPayment[] }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Appointment not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticateForModule("Finances", "can_view");
  if (error) return error;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 });
  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  const accessError = canAccessClinic(session.user.role, session.user.clinic_id, appointment.clinic_id, "Forbidden: Appointment belongs to a different clinic");
  if (accessError) return accessError;

  const payments = await InvoiceRepository.paymentsForAppointment(id);
  return NextResponse.json({ payments }, { status: 200 });
}
