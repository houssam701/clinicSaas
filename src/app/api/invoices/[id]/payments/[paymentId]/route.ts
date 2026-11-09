import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { UUID_REGEX } from "@/services/api-guard";
import { authorizeInvoice } from "@/services/invoice-rules";

interface RouteContext {
  params: Promise<{ id: string; paymentId: string }>;
}

/**
 * DELETE /api/invoices/[id]/payments/[paymentId]
 *
 * Removes a payment recorded by mistake (soft delete: kept for audit) and
 * updates the invoice's status.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_delete on "Finances" (own clinic)
 *
 * Responses:
 *   200  { status: InvoiceStatus }
 *   400  Invalid UUID(s)
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Invoice or payment not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params;
  const { error } = await authorizeInvoice(id, "can_delete");
  if (error) return error;

  if (!UUID_REGEX.test(paymentId)) {
    return NextResponse.json({ error: "Invalid payment ID format" }, { status: 400 });
  }
  if (!(await InvoiceRepository.findPayment(id, paymentId))) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const status = await InvoiceRepository.removePayment(id, paymentId);
  if (!status) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ status }, { status: 200 });
}
