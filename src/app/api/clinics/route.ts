import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { ClinicRepository } from "../../../repository/clinic-repository";
import { UserRole } from "../../../types/users";
import {
  CreateClinicSchema,
  ListClinicsQuerySchema,
} from "../../../types/clinics";

/**
 * GET /api/clinics
 *
 * Lists clinics across the system.
 * Only SuperAdmin users are authorized to list clinics.
 *
 * Auth:          Required
 * Authorization: SuperAdmin only
 *
 * Query Params (optional):
 *   clinic_type?: "Dentistry" | "Therapy"
 *   search?:      string (matches clinic name case-insensitively)
 *
 * Responses:
 *   200  { clinics: ClinicModel[] }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function GET(request: NextRequest) {
  // 1. Auth guard
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization guard: SuperAdmin only
  if (session.user.role !== UserRole.SuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: SuperAdmin role required" },
      { status: 403 }
    );
  }

  // 3. Parse optional query parameters
  const searchParams = request.nextUrl.searchParams;
  const clinic_type = searchParams.get("clinic_type") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const parsedQuery = ListClinicsQuerySchema.safeParse({ clinic_type, search });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Retrieve clinics via repository
  const clinics = await ClinicRepository.findAll({
    clinic_type: parsedQuery.data.clinic_type,
    search: parsedQuery.data.search,
  });

  return NextResponse.json({ clinics }, { status: 200 });
}

/**
 * POST /api/clinics
 *
 * Creates a new clinic record.
 * Only SuperAdmin users are authorized to create clinics.
 *
 * Auth:          Required
 * Authorization: SuperAdmin only
 *
 * Body:
 *   name        string (min 1 char)
 *   clinic_type "Dentistry" | "Therapy"
 *
 * Responses:
 *   201  { message: "Clinic created successfully", clinic: ClinicModel }
 *   400  Validation error
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function POST(request: NextRequest) {
  // 1. Auth guard
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization guard: SuperAdmin only
  if (session.user.role !== UserRole.SuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: SuperAdmin role required" },
      { status: 403 }
    );
  }

  // 3. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 4. Validate with Zod
  const parsed = CreateClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 5. Persist via repository
  const clinic = await ClinicRepository.createClinic(parsed.data);

  return NextResponse.json(
    { message: "Clinic created successfully", clinic },
    { status: 201 }
  );
}
