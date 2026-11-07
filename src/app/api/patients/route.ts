import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "@/repository/patient-repository";
import { ClinicRepository } from "@/repository/clinic-repository";
import { UserRole } from "@/types/users";
import type { JsonValue } from "@prisma/orm-postgres/utils/json";
import {
  CreatePatientSchema,
  ListPatientsQuerySchema,
} from "@/types/patients";
import { authenticateForModule, canAccessClinic } from "@/services";

/**
 * GET /api/patients
 *
 * Lists patients with pagination and optional search/filter.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Patients"
 *   - SuperAdmin: Can pass ?clinic_id= to scope results; otherwise returns all.
 *   - Admin/Staff: Auto-scoped to their own clinic; ?clinic_id is ignored.
 *
 * Query Params:
 *   page?:      number  (min 1, default 1)
 *   limit?:     number  (min 1, max 200, default DEFAULT_PAGE_SIZE)
 *   clinic_id?: string  (UUID, SuperAdmin only)
 *   search?:    string  (matches first_name, last_name, email, phone)
 *
 * Responses:
 *   200  { patients: PatientModel[], total: number, page: number, limit: number }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden (missing can_view on "Patients")
 */
export async function GET(request: NextRequest) {
  // 1. Auth + can_view on "Patients" (the SuperAdmin skips the permission check)
  const { session, error } = await authenticateForModule("Patients", "can_view");
  if (error) return error;

  const caller = session.user;

  // 3. Parse and validate query params
  const sp = request.nextUrl.searchParams;
  const raw = {
    page:      sp.get("page")      ?? undefined,
    limit:     sp.get("limit")     ?? undefined,
    clinic_id: sp.get("clinic_id") ?? undefined,
    search:    sp.get("search")    ?? undefined,
  };

  const parsed = ListPatientsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, search } = parsed.data;

  // 4. Determine effective clinic_id
  //    Admin and Staff are always locked to their own clinic regardless of query param.
  let clinic_id: string | undefined;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: You are not associated with a clinic" },
        { status: 403 }
      );
    }
    clinic_id = caller.clinic_id;
  } else {
    // SuperAdmin — use the query param if provided
    clinic_id = parsed.data.clinic_id;
  }

  // 5. Fetch paginated patients
  const result = await PatientRepository.findPage({ clinic_id, search, page, limit });

  return NextResponse.json(
    { patients: result.data, total: result.total, page, limit },
    { status: 200 }
  );
}

/**
 * POST /api/patients
 *
 * Creates a new patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Patients"
 *   - Admin/Staff: the patient joins their own clinic; clinic_id may be left out
 *     (when sent, it must match their clinic).
 *   - SuperAdmin: clinic_id is required and must be an existing clinic.
 *
 * Body: CreatePatientSchema fields
 *
 * Responses:
 *   201  { patient: PatientModel }
 *   400  Invalid JSON
 *   401  Unauthorized
 *   403  Forbidden (clinic mismatch, or missing can_create on "Patients")
 *   422  Validation error (incl. missing or unknown clinic_id for the SuperAdmin)
 */
export async function POST(request: NextRequest) {
  // 1. Auth + can_create on "Patients" (the SuperAdmin skips the permission check)
  const { session, error } = await authenticateForModule("Patients", "can_create");
  if (error) return error;

  const caller = session.user;

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = CreatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 3. Resolve the clinic: Admin and Staff always use their own (a clinic_id
  //    in the body must match it); the SuperAdmin must name an existing one.
  let clinic_id: string;
  if (caller.role !== UserRole.SuperAdmin) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: You are not associated with a clinic" },
        { status: 403 }
      );
    }
    if (parsed.data.clinic_id) {
      const clinicAccessError = canAccessClinic(
        caller.role,
        caller.clinic_id,
        parsed.data.clinic_id,
        "Forbidden: You can only create patients for your own clinic"
      );
      if (clinicAccessError) return clinicAccessError;
    }
    clinic_id = caller.clinic_id;
  } else {
    if (!parsed.data.clinic_id) {
      return NextResponse.json(
        { error: "Validation failed", details: { fieldErrors: { clinic_id: ["Clinic is required."] } } },
        { status: 422 }
      );
    }
    if (!(await ClinicRepository.exists(parsed.data.clinic_id))) {
      return NextResponse.json(
        { error: "Validation failed", details: { fieldErrors: { clinic_id: ["This clinic does not exist."] } } },
        { status: 422 }
      );
    }
    clinic_id = parsed.data.clinic_id;
  }

  // 4. Persist patient
  const patient = await PatientRepository.createPatient({
    ...parsed.data,
    clinic_id,
    specialized_data: parsed.data.specialized_data as JsonValue | undefined,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
