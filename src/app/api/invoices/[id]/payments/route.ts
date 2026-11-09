import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { CreatePaymentSchema } from "@/types/invoices";
import { authorizeInvoice, invoiceFieldError } from "@/services/invoice-rules";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/payments
 *
 * Records money received on an invoice: the whole balance at once, or any
 * part of it. More than the remaining balance is refused. The invoice's
 * status follows (Unpaid → Partial → Paid).
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Finances" (own clinic)
 *
 * Body: { amount, payment_method, payment_date? (default now), notes?, appointment_id? }
 *   appointment_id must be one of the invoice patient's appointments.
 *
 * Responses:
 *   201  { payment: PaymentModel, status: InvoiceStatus }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Invoice not found
 *   422  Validation error, or more than the balance
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { invoice, error } = await authorizeInvoice(id, "can_create");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { appointment_id } = parsed.data;
  if (appointment_id && !(await InvoiceRepository.appointmentMatches(appointment_id, invoice.clinic_id, invoice.patient_id))) {
    return invoiceFieldError("appointment_id", "This appointment is not this patient's.");
  }

  const result = await InvoiceRepository.addPayment({
    ...parsed.data,
    payment_date: parsed.data.payment_date ?? new Date().toISOString(),
    clinic_id: invoice.clinic_id,
    invoice_id: id,
  });
  if ("refused" in result) {
    if (result.refused.reason === "not_found") return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return invoiceFieldError(
      "amount",
      result.refused.balance === "0.00" ? "This invoice is already paid in full." : `Only ${result.refused.balance} is left to pay.`
    );
  }
  return NextResponse.json(result, { status: 201 });
}
