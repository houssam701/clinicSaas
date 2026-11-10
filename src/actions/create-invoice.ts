"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import { readInvoiceForm, type InvoiceFormState } from "@/lib/finance-form";
import type { InvoiceModel } from "@/types/invoices";

/**
 * Server Action: createInvoiceAction
 *
 * Creates a treatment charge through POST /api/invoices, then, when the form
 * says money was received right away, records it through
 * POST /api/invoices/[id]/payments (the whole cost at once, or a first part).
 * Opens the treatment's page afterwards.
 */
export async function createInvoiceAction(_prevState: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const { invoice, paidNow, method } = readInvoiceForm(formData);
  if (!invoice.patient_id) return { error: "Please fix the highlighted fields.", fieldErrors: { patient_id: ["Choose a patient."] } };
  if (paidNow && !method) return { error: "Please fix the highlighted fields.", fieldErrors: { payment_method: ["Choose how it was paid."] } };

  const created = await sendApiJson(API_PATHS.invoices.list(), "POST", invoice);
  if (created?.status !== 201) return toFormState(created, "This patient no longer exists.");
  const { invoice: saved }: { invoice: InvoiceModel } = await created.json();

  let paymentFailed = false;
  if (paidNow) {
    const paid = await sendApiJson(API_PATHS.invoices.payments(saved.id), "POST", { amount: paidNow, payment_method: method });
    paymentFailed = paid?.status !== 201;
  }

  revalidatePath(PATHS.finances.list());
  revalidatePath(PATHS.patients.detail(saved.patient_id));
  // The treatment exists either way; its page says if the first payment was not saved
  redirect(PATHS.finances.detail(saved.id, paymentFailed ? { payment_failed: 1 } : { created: 1 }));
}
