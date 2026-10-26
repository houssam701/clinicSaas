import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import {
  CreateInvoiceSchema,
  ListInvoicesQuerySchema,
} from "@/types/invoices";
import { authenticate, canAccessClinic, checkModulePermission } from "@/services";

/**
 * GET /api/invoices
 *
 * Lists invoices with pagination and optional filters.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - SuperAdmin: can filter by ?clinic_id; otherwise sees all clinics
 *   - Admin:      always auto-scoped to their own clinic
 *   - Staff:      auto-scoped to their clinic; requires can_view on "Invoices"
 *
 * Query Params:
 *   page?:           number  (min 1, default 1)
 *   limit?:          number  (min 1, max 200, default 20)
 *   clinic_id?:      UUID    (SuperAdmin only)
 *   patient_id?:     UUID
 *   appointment_id?: UUID
 *   status?:         Unpaid | Partial | Paid
 *   from?:           ISO-8601 datetime
 *   to?:             ISO-8601 datetime
 *
 * Responses:
 *   200  { data: InvoiceModel[], meta: PaginationMeta }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function GET(request: NextRequest) {
  // 1. Auth
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // 2. Staff: check module permission
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Invoices", "can_view");
    if (permError) return permError;
  }

  // 3. Parse & validate query params
  const sp = request.nextUrl.searchParams;
  const raw = {
    page:           sp.get("page")           ?? undefined,
    limit:          sp.get("limit")          ?? undefined,
    clinic_id:      sp.get("clinic_id")      ?? undefined,
    patient_id:     sp.get("patient_id")     ?? undefined,
    appointment_id: sp.get("appointment_id") ?? undefined,
    status:         sp.get("status")         ?? undefined,
    from:           sp.get("from")           ?? undefined,
    to:             sp.get("to")             ?? undefined,
  };

  const parsed = ListInvoicesQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, patient_id, appointment_id, status, from, to } = parsed.data;

  // 4. Determine effective clinic_id
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
    // SuperAdmin — use query param if provided
    clinic_id = parsed.data.clinic_id;
  }

  // 5. Fetch paginated invoices
  const result = await InvoiceRepository.findAll({
    clinic_id,
    patient_id,
    appointment_id,
    status,
    from,
    to,
    page,
    limit,
  });

  const total_pages = Math.ceil(result.total / limit);

  return NextResponse.json(
    {
      data: result.data,
      meta: { page, limit, total_items: result.total, total_pages },
    },
    { status: 200 }
  );
}

/**
 * POST /api/invoices
 *
 * Creates a new invoice. Status defaults to Unpaid.
 *
 * Auth:          Required
 * Authorization:
 *   - SuperAdmin: always allowed
 *   - Admin:      clinic_id in body must match their own clinic
 *   - Staff:      requires can_create on "Invoices"; clinic_id auto-set to their clinic
 *
 * Body: CreateInvoiceSchema fields
 *
 * Responses:
 *   201  { data: InvoiceModel }
 *   401  Unauthorized
 *   403  Forbidden
 *   422  Validation error
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  // 2. Staff: check module permission
  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Invoices", "can_create");
    if (permError) return permError;
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  // 4. For Staff, inject their own clinic_id so they cannot spoof it
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
  const parsed = CreateInvoiceSchema.safeParse(body);
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
      "Forbidden: You can only create invoices for your own clinic"
    );
    if (clinicAccessError) return clinicAccessError;
  }

  // 7. Persist
  const invoice = await InvoiceRepository.createInvoice(parsed.data);

  return NextResponse.json({ data: invoice }, { status: 201 });
}
