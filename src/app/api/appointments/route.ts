import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { UserRole } from "@/types/users";
import {
  CreateAppointmentSchema,
  ListAppointmentsQuerySchema,
} from "@/types/appointments";
import { authenticate, canAccessClinic, checkModulePermission } from "@/services";

/**
 * GET /api/appointments
 *
 * Lists appointments with pagination and optional filters.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - SuperAdmin: can filter by ?clinic_id; otherwise sees all clinics
 *   - Admin:      always auto-scoped to their own clinic
 *   - Staff:      auto-scoped to their clinic; requires can_view on "Appointments"
 *
 * Query Params:
 *   page?:       number  (min 1, default 1)
 *   limit?:      number  (min 1, max 200, default 20)
 *   clinic_id?:  UUID    (SuperAdmin only)
 *   patient_id?: UUID
 *   user_id?:    UUID
 *   status?:     Scheduled | Completed | Canceled | NoShow
 *   from?:       ISO-8601 datetime
 *   to?:         ISO-8601 datetime
 *
 * Responses:
 *   200  { data: AppointmentModel[], total, page, limit }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden (wrong role or missing Staff permission)
 */
export async function GET(request: NextRequest) {
  // 1. Auth – all three roles can attempt a list
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // 2. Staff: check module permission
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Appointments", "can_view");
    if (permError) return permError;
  }

  // 3. Parse & validate query params
  const sp = request.nextUrl.searchParams;
  const raw = {
    page:       sp.get("page")       ?? undefined,
    limit:      sp.get("limit")      ?? undefined,
    clinic_id:  sp.get("clinic_id")  ?? undefined,
    patient_id: sp.get("patient_id") ?? undefined,
    user_id:    sp.get("user_id")    ?? undefined,
    status:     sp.get("status")     ?? undefined,
    from:       sp.get("from")       ?? undefined,
    to:         sp.get("to")         ?? undefined,
  };

  const parsed = ListAppointmentsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, patient_id, user_id, status, from, to } = parsed.data;

  // 4. Determine effective clinic_id
  //    Admin & Staff are always locked to their own clinic.
  let clinic_id: string | undefined;
  if (caller.role === UserRole.Admin || caller.role === UserRole.Staff) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: User is not associated with a clinic" },
        { status: 403 }
      );
    }
    clinic_id = caller.clinic_id;
  } else {
    // SuperAdmin — use the query param if provided
    clinic_id = parsed.data.clinic_id;
  }

  // 5. Fetch paginated appointments
  const result = await AppointmentRepository.findAll({
    clinic_id,
    patient_id,
    user_id,
    status,
    from,
    to,
    page,
    limit,
  });

  return NextResponse.json(
    { data: result.data, total: result.total, page, limit },
    { status: 200 }
  );
}

/**
 * POST /api/appointments
 *
 * Creates a new appointment.
 *
 * Auth:          Required
 * Authorization:
 *   - SuperAdmin: always allowed
 *   - Admin:      always allowed; clinic_id in body must match their own clinic
 *   - Staff:      requires can_create on "Appointments"; clinic_id auto-set to their own clinic
 *
 * Body: CreateAppointmentSchema fields
 *
 * Responses:
 *   201  { appointment: AppointmentModel }
 *   401  Unauthorized
 *   403  Forbidden (wrong role or missing Staff permission)
 *   409  Scheduling conflict
 *   422  Validation error
 */
export async function POST(request: NextRequest) {
  // 1. Auth – all three roles can attempt to create
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // 2. Staff: check module permission before touching the body
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Appointments", "can_create");
    if (permError) return permError;
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  // 4. For Staff, inject their own clinic_id so they can't spoof it
  if (caller.role === UserRole.Staff) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Staff is not associated with a clinic" },
        { status: 403 }
      );
    }
    (body as Record<string, unknown>).clinic_id = caller.clinic_id;
  }

  // 5. Validate
  const parsed = CreateAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 6. Enforce clinic boundary for Admin
  if (caller.role === UserRole.Admin) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Admin is not associated with a clinic" },
        { status: 403 }
      );
    }
    const clinicAccessError = canAccessClinic(
      caller.role,
      caller.clinic_id,
      parsed.data.clinic_id,
      "Forbidden: You can only create appointments for your own clinic"
    );
    if (clinicAccessError) return clinicAccessError;
  }

  // 7. Check scheduling conflict if a staff member is assigned
  if (parsed.data.user_id) {
    const conflict = await AppointmentRepository.hasConflict({
      user_id:          parsed.data.user_id,
      scheduled_time:   parsed.data.scheduled_time,
      duration_minutes: parsed.data.duration_minutes,
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Scheduling conflict: the assigned staff member already has an appointment in this time slot" },
        { status: 409 }
      );
    }
  }

  // 8. Persist
  const appointment = await AppointmentRepository.createAppointment(parsed.data);

  return NextResponse.json({ appointment }, { status: 201 });
}
