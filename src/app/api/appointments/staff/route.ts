import { NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { UserRole } from "@/types/users";
import { authenticateForModule } from "@/services";

/**
 * GET /api/appointments/staff
 *
 * The Admins of the caller's clinic (id, name, role only): the people
 * appointments are held with, i.e. the calendar's columns and the form's
 * "With" choices. Staff never hold appointments. Separate from
 * /api/users, which needs the Staff/Admins management permissions.
 *
 * Auth:          Required
 * Authorization: Admin/Staff with can_view on "Appointments" (own clinic only)
 *
 * Responses:
 *   200  { staff: AppointmentStaffMember[] }
 *   401  Unauthorized
 *   403  Forbidden (missing can_view, no clinic, or SuperAdmin)
 */
export async function GET() {
  const { session, error } = await authenticateForModule("Appointments", "can_view");
  if (error) return error;

  const clinicId = session.user.clinic_id;
  if (session.user.role === UserRole.SuperAdmin || !clinicId) {
    return NextResponse.json({ error: "Forbidden: This list is for clinic members" }, { status: 403 });
  }

  const staff = await AppointmentRepository.findClinicProviders(clinicId);
  return NextResponse.json({ staff }, { status: 200 });
}
