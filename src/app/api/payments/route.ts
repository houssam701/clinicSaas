import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository, PaymentRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import {
  ListPaymentsQuerySchema,
} from "@/types/invoices";
import { authenticate, checkModulePermission } from "@/services";

/**
 * GET /api/payments
 *
 * Lists all payments with pagination and optional filters.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - SuperAdmin: can filter by ?clinic_id; otherwise sees all clinics
 *   - Admin:      always auto-scoped to their own clinic
 *   - Staff:      auto-scoped to their clinic; requires can_view on "Payments"
 *
 * Query Params:
 *   page?:           number  (min 1, default 1)
 *   limit?:          number  (min 1, max 200, default 20)
 *   clinic_id?:      UUID    (SuperAdmin only)
 *   invoice_id?:     UUID
 *   payment_method?: Cash | Card | Transfer | Insurance
 *   from?:           ISO-8601 datetime
 *   to?:             ISO-8601 datetime
 *
 * Responses:
 *   200  { data: PaymentModel[], meta: PaginationMeta }
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
    const permError = await checkModulePermission(caller.id, "Payments", "can_view");
    if (permError) return permError;
  }

  // 3. Parse & validate query params
  const sp = request.nextUrl.searchParams;
  const raw = {
    page:           sp.get("page")           ?? undefined,
    limit:          sp.get("limit")          ?? undefined,
    clinic_id:      sp.get("clinic_id")      ?? undefined,
    invoice_id:     sp.get("invoice_id")     ?? undefined,
    payment_method: sp.get("payment_method") ?? undefined,
    from:           sp.get("from")           ?? undefined,
    to:             sp.get("to")             ?? undefined,
  };

  const parsed = ListPaymentsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, invoice_id, payment_method, from, to } = parsed.data;

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
    clinic_id = parsed.data.clinic_id;
  }

  // 5. Fetch paginated payments
  const result = await PaymentRepository.findAll({
    clinic_id,
    invoice_id,
    payment_method,
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
