import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository, statusFor } from "@/repository/invoice-repository";
import { UpdateInvoiceSchema } from "@/types/invoices";
import { toCents } from "@/lib/money";
import { authorizeInvoice, invoiceFieldError } from "@/services/invoice-rules";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]
 *
 * One invoice with its patient, paid amount and balance.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_view on "Finances" (own clinic)
 *
 * Responses:
 *   200  { invoice: InvoiceSummary }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found (or deleted)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { invoice, error } = await authorizeInvoice(id, "can_view");
  if (error) return error;
  return NextResponse.json({ invoice }, { status: 200 });
}

/**
 * PATCH /api/invoices/[id]
 *
 * Changes the total or the due date. The total cannot go below what is
 * already paid; the status is recalculated from the payments.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_edit on "Finances" (own clinic)
 *
 * Body: { total_amount?, due_date? }
 *
 * Responses:
 *   200  { invoice: InvoiceModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 *   422  Validation error (incl. a total below the paid amount)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { invoice, error } = await authorizeInvoice(id, "can_edit");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = UpdateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const paidCents = toCents(invoice.paid_amount);
  const totalCents = parsed.data.total_amount ? toCents(parsed.data.total_amount) : toCents(invoice.total_amount);
  if (totalCents < paidCents) {
    return invoiceFieldError("total_amount", `The total cannot be less than what is already paid (${invoice.paid_amount}).`);
  }

  const updated = await InvoiceRepository.update(id, { ...parsed.data, status: statusFor(totalCents, paidCents) });
  return NextResponse.json({ invoice: updated }, { status: 200 });
}

/**
 * DELETE /api/invoices/[id]
 *
 * Soft-deletes the invoice and its payments: they disappear from lists but
 * are kept for audit.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_delete on "Finances" (own clinic)
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { error } = await authorizeInvoice(id, "can_delete");
  if (error) return error;

  await InvoiceRepository.softDelete(id);
  return new NextResponse(null, { status: 204 });
}
