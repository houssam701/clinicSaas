import { NextRequest, NextResponse } from "next/server";
import { AppointmentRepository } from "@/repository/appointment-repository";
import { ClinicRepository } from "@/repository/clinic-repository";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { AppointmentPaymentSchema, InvoiceStatus } from "@/types/invoices";
import { UUID_REGEX, authenticateForModule, canAccessClinic } from "@/services/api-guard";
import { invoiceFieldError } from "@/services/invoice-rules";
import { formatDay, zonedParts } from "@/lib/time-zone";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/appointments/[id]/payment
 *
 * Money received during an appointment, recorded on the visit:
 *   - with invoice_id: a payment on that open invoice (a treatment paid in
 *     parts); more than its balance is refused
 *   - without: pay-per-visit, a charge for this visit of that amount,
 *     already paid in full
 * Either way the payment is linked to the appointment.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, or Admin/Staff with can_create on "Finances";
 *                the appointment and the invoice must be in the caller's clinic,
 *                and the invoice must be the appointment patient's.
 *
 * Body: { amount, payment_method, invoice_id?, notes? }
 *
 * Responses:
 *   201  { payment, invoice_id, status }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Appointment not found
 *   422  Validation error, an invoice of someone else, already paid, or more than the balance
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticateForModule("Finances", "can_create");
  if (error) return error;

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 });
  const appointment = await AppointmentRepository.findById(id);
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  const accessError = canAccessClinic(session.user.role, session.user.clinic_id, appointment.clinic_id, "Forbidden: Appointment belongs to a different clinic");
  if (accessError) return accessError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }
  const parsed = AppointmentPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { invoice_id, ...money } = parsed.data;
  const payment = { ...money, payment_date: new Date().toISOString() };

  // A treatment paid in parts
  if (invoice_id) {
    const invoice = await InvoiceRepository.findById(invoice_id);
    if (!invoice || invoice.clinic_id !== appointment.clinic_id || invoice.patient_id !== appointment.patient_id) {
      return invoiceFieldError("invoice_id", "This treatment is not this patient's.");
    }
    if (invoice.status === InvoiceStatus.Paid) return invoiceFieldError("invoice_id", "This treatment is already paid in full.");

    const result = await InvoiceRepository.addPayment({
      ...payment,
      clinic_id: appointment.clinic_id,
      invoice_id,
      appointment_id: id,
    });
    if ("refused" in result) {
      if (result.refused.reason === "not_found") return invoiceFieldError("invoice_id", "This treatment no longer exists.");
      return invoiceFieldError("amount", `Only ${result.refused.balance} is left to pay on this treatment.`);
    }
    return NextResponse.json({ payment: result.payment, invoice_id, status: result.status }, { status: 201 });
  }

  // Pay-per-visit
  const clinic = await ClinicRepository.findById(appointment.clinic_id);
  const day = zonedParts(new Date(appointment.scheduled_time), clinic?.timezone ?? "UTC").date;
  const created = await InvoiceRepository.createVisitCharge({
    clinic_id: appointment.clinic_id,
    patient_id: appointment.patient_id,
    appointment_id: id,
    title: `Visit on ${formatDay(day)}`,
    payment,
  });
  return NextResponse.json(
    { payment: created.payment, invoice_id: created.invoice.id, status: InvoiceStatus.Paid },
    { status: 201 }
  );
}
