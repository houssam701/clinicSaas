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
 *   page?:        number (min 1, default 1)
 *   limit?:       number (min 1, max 200, default 20)
 *   clinic_type?: "Dentistry" | "Therapy"
 *   search?:      string (matches clinic name case-insensitively)
 *
 * Responses:
 *   200  { clinics: ClinicModel[], total: number, page: number, limit: number }
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
  const parsedQuery = ListClinicsQuerySchema.safeParse({
    page:        searchParams.get("page") ?? undefined,
    limit:       searchParams.get("limit") ?? undefined,
    clinic_type: searchParams.get("clinic_type") ?? undefined,
    search:      searchParams.get("search") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Retrieve one page of clinics via repository
  const { page, limit, clinic_type, search } = parsedQuery.data;
  const result = await ClinicRepository.findPage({ clinic_type, search, page, limit });

  return NextResponse.json({ clinics: result.data, total: result.total, page, limit }, { status: 200 });
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
 *   409  A clinic with this name already exists
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

  // 5. Clinic names are unique
  if (await ClinicRepository.findByName(parsed.data.name)) {
    return NextResponse.json(
      {
        error: "A clinic with this name already exists.",
        details: { fieldErrors: { name: ["A clinic with this name already exists."] } },
      },
      { status: 409 }
    );
  }

  // 6. Persist via repository
  const clinic = await ClinicRepository.createClinic(parsed.data);

  return NextResponse.json(
    { message: "Clinic created successfully", clinic },
    { status: 201 }
  );
}
