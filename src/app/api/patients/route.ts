import { NextRequest, NextResponse } from "next/server";
import { PatientRepository } from "@/repository/patient-repository";
import { UserRole } from "@/types/users";
import type { JsonValue } from "@prisma/orm-postgres/utils/json";
import {
  CreatePatientSchema,
  ListPatientsQuerySchema,
} from "@/types/patients";
import { authenticate, canAccessClinic } from "@/services";

/**
 * GET /api/patients
 *
 * Lists patients with pagination and optional search/filter.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin
 *   - SuperAdmin: Can pass ?clinic_id= to scope results; otherwise returns all.
 *   - Admin:      Auto-scoped to their own clinic; ?clinic_id is ignored.
 *
 * Query Params:
 *   page?:      number  (min 1, default 1)
 *   limit?:     number  (min 1, max 200, default 20)
 *   clinic_id?: string  (UUID, SuperAdmin only)
 *   search?:    string  (matches first_name, last_name, email, phone)
 *
 * Responses:
 *   200  { data: PatientModel[], total: number, page: number, limit: number }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden (Staff role)
 */
export async function GET(request: NextRequest) {
  // 1. Auth & role guard (Admin or SuperAdmin)
  const { session, error } = await authenticate();
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
  //    Admin is always locked to their own clinic regardless of query param.
  let clinic_id: string | undefined;
  if (caller.role === UserRole.Admin) {
    if (!caller.clinic_id) {
      return NextResponse.json(
        { error: "Forbidden: Admin is not associated with a clinic" },
        { status: 403 }
      );
    }
    clinic_id = caller.clinic_id;
  } else {
    // SuperAdmin — use the query param if provided
    clinic_id = parsed.data.clinic_id;
  }

  // 5. Fetch paginated patients
  const result = await PatientRepository.findAll({ clinic_id, search, page, limit });

  return NextResponse.json(
    { data: result.data, total: result.total, page, limit },
    { status: 200 }
  );
}

/**
 * POST /api/patients
 *
 * Creates a new patient.
 *
 * Auth:          Required
 * Authorization: SuperAdmin or Admin
 *   - Admin: clinic_id in body must match their own clinic.
 *
 * Body: CreatePatientSchema fields
 *
 * Responses:
 *   201  { patient: PatientModel }
 *   400  Invalid JSON
 *   401  Unauthorized
 *   403  Forbidden (clinic mismatch for Admin or unauthorized role)
 *   422  Validation error
 */
export async function POST(request: NextRequest) {
  // 1. Auth & role guard (Admin or SuperAdmin)
  const { session, error } = await authenticate();
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

  // 3. Enforce clinic boundary for Admin
  if (caller.role === UserRole.Admin && !caller.clinic_id) {
    return NextResponse.json(
      { error: "Forbidden: Admin is not associated with a clinic" },
      { status: 403 }
    );
  }
  const clinicAccessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    parsed.data.clinic_id,
    "Forbidden: You can only create patients for your own clinic"
  );
  if (clinicAccessError) return clinicAccessError;

  // 4. Persist patient
  const patient = await PatientRepository.createPatient({
    ...parsed.data,
    specialized_data: parsed.data.specialized_data as JsonValue | undefined,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
