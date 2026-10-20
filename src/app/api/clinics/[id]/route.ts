import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { ClinicRepository } from "../../../../repository/clinic-repository";
import { UserRole } from "../../../../types/users";
import { DeleteClinicSchema, UpdateClinicSchema } from "../../../../types/clinics";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clinics/[id]
 *
 * Retrieves details for a specific clinic.
 * Authorized for SuperAdmin only.
 *
 * Responses:
 *   200  { clinic: ClinicModel }
 *   400  Invalid clinic ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Clinic not found
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
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

  // 3. Validate ID
  const { id } = await context.params;
  const parsedId = DeleteClinicSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid clinic ID format (must be a valid UUID)" },
      { status: 400 }
    );
  }

  // 4. Fetch clinic
  const clinic = await ClinicRepository.findById(id);
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  return NextResponse.json({ clinic }, { status: 200 });
}

/**
 * PATCH /api/clinics/[id]
 *
 * Updates details for a specific clinic.
 * Authorized for SuperAdmin only.
 *
 * Body:
 *   name?        string
 *   clinic_type? string
 *
 * Responses:
 *   200  { message: "Clinic updated successfully", clinic: ClinicModel }
 *   400  Validation error
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Clinic not found
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

  // 3. Validate ID
  const { id } = await context.params;
  const parsedId = DeleteClinicSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid clinic ID format (must be a valid UUID)" },
      { status: 400 }
    );
  }

  // 4. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 5. Ensure clinic exists
  const existingClinic = await ClinicRepository.findById(id);
  if (!existingClinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // 6. Update clinic
  const updatedClinic = await ClinicRepository.updateClinic(id, {
    name: parsed.data.name,
    clinic_type: parsed.data.clinic_type,
  });

  return NextResponse.json(
    { message: "Clinic updated successfully", clinic: updatedClinic },
    { status: 200 }
  );
}

/**
 * DELETE /api/clinics/[id]
 *
 * Deletes a clinic and cleanly cascades through its multi-tenant records in a transaction.
 * Authorized for SuperAdmin only.
 *
 * Responses:
 *   204  No Content (clinic deleted successfully)
 *   400  Invalid clinic ID format
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Clinic not found
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
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

  // 3. Validate ID
  const { id } = await context.params;
  const parsedId = DeleteClinicSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Invalid clinic ID format (must be a valid UUID)" },
      { status: 400 }
    );
  }

  // 4. Ensure clinic exists
  const existingClinic = await ClinicRepository.findById(id);
  if (!existingClinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // 5. Delete clinic transactionally
  await ClinicRepository.deleteClinic(id);

  return new NextResponse(null, { status: 204 });
}
