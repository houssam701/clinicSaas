import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository, PaymentRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import { CreatePaymentSchema } from "@/types/invoices";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
  checkModulePermission,
} from "@/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/payments
 *
 * Lists all payments recorded against a specific invoice.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_view on "Payments"
 *
 * Responses:
 *   200  { data: PaymentModel[], meta: PaginationMeta }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Invoice not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Payments", "can_view");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 });
  }

  // Verify invoice exists and caller can access it
  const invoice = await InvoiceRepository.findById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return accessError;

  const payments = await PaymentRepository.findByInvoice(id);

  return NextResponse.json(
    {
      data: payments,
      meta: { page: 1, limit: payments.length, total_items: payments.length, total_pages: 1 },
    },
    { status: 200 }
  );
}

/**
 * POST /api/invoices/[id]/payments
 *
 * Records a payment against an invoice.
 * Automatically recalculates the invoice status (Unpaid → Partial → Paid).
 * Returns 409 if the payment amount would exceed the remaining balance.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_create on "Payments"
 *
 * Body: CreatePaymentSchema fields (invoice_id and clinic_id are taken from the route / session)
 *
 * Responses:
 *   201  { data: PaymentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Invoice not found
 *   409  Payment amount exceeds remaining balance
 *   422  Validation error
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Payments", "can_create");
    if (permError) return permError;
  }

  const { id: invoiceId } = await context.params;
  if (!UUID_REGEX.test(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 });
  }

  // Verify invoice exists
  const invoice = await InvoiceRepository.findById(invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return accessError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  // Inject route-derived fields — callers cannot override these
  const enriched = {
    ...(body as Record<string, unknown>),
    invoice_id: invoiceId,
    clinic_id:  invoice.clinic_id,
  };

  const parsed = CreatePaymentSchema.safeParse(enriched);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Balance check: reject overpayment
  const alreadyPaid   = await PaymentRepository.sumByInvoice(invoiceId);
  const remaining     = Number(invoice.total_amount) - alreadyPaid;

  if (parsed.data.amount > remaining) {
    return NextResponse.json(
      {
        status_code: 409,
        message: `Payment amount (${parsed.data.amount}) exceeds remaining balance (${remaining.toFixed(2)})`,
      },
      { status: 409 }
    );
  }

  // Persist payment
  const payment = await PaymentRepository.createPayment(parsed.data);

  // Recalculate invoice status
  await InvoiceRepository.recalculateStatus(invoiceId);

  return NextResponse.json({ data: payment }, { status: 201 });
}
