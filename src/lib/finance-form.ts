/**
 * Shared helpers for the finance forms: a new treatment (with an optional
 * payment received right away) and recording a payment.
 * Kept out of "use server" files: every export there becomes a callable action.
 */
import type { FormState } from "@/lib/patient-form";

export type InvoiceFormField = "patient_id" | "title" | "total_amount" | "due_date" | "paid_now" | "payment_method";
export type PaymentFormField = "amount" | "payment_method" | "notes" | "invoice_id";

export type InvoiceFormState = FormState<InvoiceFormField>;
export type PaymentFormState = FormState<PaymentFormField>;

const reader = (formData: FormData) => (name: string) => ((formData.get(name) as string | null) ?? "").trim();

/** The new-treatment form: the charge, plus what was paid right away (may be empty). */
export function readInvoiceForm(formData: FormData) {
  const text = reader(formData);
  return {
    invoice: {
      patient_id: text("patient_id"),
      title: text("title"),
      total_amount: text("total_amount"),
      appointment_id: text("appointment_id") || undefined,
      due_date: text("due_date") || undefined,
    },
    paidNow: text("paid_now"),
    method: text("payment_method"),
  };
}

/** The record-payment form; an empty treatment means "a visit charge" on an appointment. */
export function readPaymentForm(formData: FormData) {
  const text = reader(formData);
  return {
    amount: text("amount"),
    payment_method: text("payment_method"),
    notes: text("notes") || null,
    invoice_id: text("invoice_id") || undefined,
  };
}
