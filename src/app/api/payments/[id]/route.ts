import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository, PaymentRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import { UpdatePaymentSchema } from "@/types/invoices";
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
 * GET /api/payments/[id]
 *
 * Returns a single payment by UUID.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_view on "Payments"
 *
 * Responses:
 *   200  { data: PaymentModel }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
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
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });
  }

  const payment = await PaymentRepository.findById(id);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    payment.clinic_id,
    "Forbidden: Payment belongs to a different clinic"
  );
  if (accessError) return accessError;

  return NextResponse.json({ data: payment }, { status: 200 });
}

/**
 * PATCH /api/payments/[id]
 *
 * Updates a payment (e.g., corrects amount / method / notes).
 * Automatically recalculates the parent invoice status after the update.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_edit on "Payments"
 *
 * Responses:
 *   200  { data: PaymentModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 *   409  Updated amount would exceed the invoice remaining balance
 *   422  Validation error
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Payments", "can_edit");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });
  }

  const payment = await PaymentRepository.findById(id);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    payment.clinic_id,
    "Forbidden: Payment belongs to a different clinic"
  );
  if (accessError) return accessError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = UpdatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Overpayment check: if the caller is changing the amount, verify it still fits
  if (parsed.data.amount !== undefined) {
    const invoice = await InvoiceRepository.findById(payment.invoice_id);
    if (invoice) {
      // Exclude the current payment so its old amount is not counted twice
      const othersPaid = await PaymentRepository.sumByInvoiceExcluding(
        payment.invoice_id,
        id
      );
      const remaining = Number(invoice.total_amount) - othersPaid;
      if (parsed.data.amount > remaining) {
        return NextResponse.json(
          { error: `Updated amount (${parsed.data.amount}) exceeds remaining balance (${remaining.toFixed(2)})` },
          { status: 409 }
        );
      }
    }
  }

  const updated = await PaymentRepository.updatePayment(id, parsed.data);

  // Recalculate parent invoice status
  await InvoiceRepository.recalculateStatus(payment.invoice_id);

  return NextResponse.json({ data: updated }, { status: 200 });
}

/**
 * DELETE /api/payments/[id]
 *
 * Voids/soft-deletes a payment and recalculates the parent invoice status.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_delete on "Payments"
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Payments", "can_delete");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });
  }

  const payment = await PaymentRepository.findById(id);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    payment.clinic_id,
    "Forbidden: Payment belongs to a different clinic"
  );
  if (accessError) return accessError;

  // Snapshot invoice_id before soft-deleting (payment record will be gone after)
  const invoiceId = payment.invoice_id;

  await PaymentRepository.deletePayment(id);

  // Recalculate parent invoice status
  await InvoiceRepository.recalculateStatus(invoiceId);

  return new NextResponse(null, { status: 204 });
}
