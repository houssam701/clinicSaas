import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { ClinicRepository } from "@/repository/clinic-repository";
import { UserRole } from "@/types/users";
import { CreateAppointmentSchema, ListAppointmentsQuerySchema } from "@/types/appointments";
import { authenticateForModule, canAccessClinic } from "@/services";
import { checkAppointmentConflict, checkAppointmentPeople } from "@/services/appointment-rules";

/**
 * GET /api/appointments
 *
 * Lists appointments with their patient and staff names, ordered by start time.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Appointments"
 *   - SuperAdmin: can filter by ?clinic_id; otherwise sees all clinics
 *   - Admin/Staff: always scoped to their own clinic
 *
 * Query Params:
 *   page?:       number  (min 1, default 1)
 *   limit?:      number  (min 1, max 200, default DEFAULT_PAGE_SIZE)
 *   clinic_id?:  UUID    (SuperAdmin only)
 *   patient_id?: UUID
 *   user_id?:    UUID | "unassigned"
 *   status?:     Scheduled | Completed | Canceled | NoShow
 *   search?:     string (every word must match the patient's name, phone or email,
 *                the admin's name, or the reason for visit)
 *   from?:       ISO-8601 instant with offset (inclusive)
 *   to?:         ISO-8601 instant with offset (exclusive)
 *   sort?:       asc (default) | desc
 *
 * Responses:
 *   200  { appointments: AppointmentWithPeople[], total, page, limit }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden (missing can_view on "Appointments", or no clinic)
 */
export async function GET(request: NextRequest) {
  const { session, error } = await authenticateForModule("Appointments", "can_view");
  if (error) return error;
  const caller = session.user;

  const sp = request.nextUrl.searchParams;
  const parsed = ListAppointmentsQuerySchema.safeParse({
    page:       sp.get("page")       ?? undefined,
    limit:      sp.get("limit")      ?? undefined,
    clinic_id:  sp.get("clinic_id")  ?? undefined,
    patient_id: sp.get("patient_id") ?? undefined,
    user_id:    sp.get("user_id")    ?? undefined,
    status:     sp.get("status")     ?? undefined,
    search:     sp.get("search")     ?? undefined,
    from:       sp.get("from")       ?? undefined,
    to:         sp.get("to")         ?? undefined,
    sort:       sp.get("sort")       ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Admin and Staff are always locked to their own clinic
  let clinic_id: string | undefined;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json({ error: "Forbidden: User is not associated with a clinic" }, { status: 403 });
    }
    clinic_id = caller.clinic_id;
  } else {
    clinic_id = parsed.data.clinic_id;
  }

  const { page, limit } = parsed.data;
  const result = await AppointmentRepository.findPage({ ...parsed.data, clinic_id });

  return NextResponse.json({ appointments: result.data, total: result.total, page, limit }, { status: 200 });
}

/**
 * POST /api/appointments
 *
 * Books an appointment.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Appointments"
 *   - Admin/Staff: booked in their own clinic (clinic_id may be left out; when
 *     sent it must match)
 *   - SuperAdmin: clinic_id is required and must exist
 *   The patient and the assigned staff member must belong to that clinic.
 *
 * Body: CreateAppointmentSchema fields (scheduled_time is an instant with offset)
 *
 * Responses:
 *   201  { appointment: AppointmentModel }
 *   400  Invalid JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   409  Scheduling conflict (the staff member is already booked)
 *   422  Validation error (incl. a patient or staff member of another clinic)
 */
export async function POST(request: NextRequest) {
  const { session, error } = await authenticateForModule("Appointments", "can_create");
  if (error) return error;
  const caller = session.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = CreateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Resolve the clinic
  let clinicId: string;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json({ error: "Forbidden: User is not associated with a clinic" }, { status: 403 });
    }
    if (parsed.data.clinic_id) {
      const clinicAccessError = canAccessClinic(
        caller.role,
        caller.clinic_id,
        parsed.data.clinic_id,
        "Forbidden: You can only create appointments for your own clinic"
      );
      if (clinicAccessError) return clinicAccessError;
    }
    clinicId = caller.clinic_id;
  } else {
    if (!parsed.data.clinic_id || !(await ClinicRepository.exists(parsed.data.clinic_id))) {
      return NextResponse.json(
        { error: "Validation failed", details: { fieldErrors: { clinic_id: ["Choose an existing clinic."] } } },
        { status: 422 }
      );
    }
    clinicId = parsed.data.clinic_id;
  }

  const peopleError = await checkAppointmentPeople({
    clinicId,
    patientId: parsed.data.patient_id,
    userId: parsed.data.user_id,
  });
  if (peopleError) return peopleError;

  const conflictError = await checkAppointmentConflict({
    userId: parsed.data.user_id,
    scheduledTime: parsed.data.scheduled_time,
    durationMinutes: parsed.data.duration_minutes,
  });
  if (conflictError) return conflictError;

  const appointment = await AppointmentRepository.createAppointment({ ...parsed.data, clinic_id: clinicId });
  return NextResponse.json({ appointment }, { status: 201 });
}
