"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import { readPaymentForm, type PaymentFormState } from "@/lib/finance-form";

/**
 * Server Action: recordPaymentAction
 *
 * Bound to a treatment (invoice) and its patient. Records money received
 * through POST /api/invoices/[id]/payments; more than the balance is refused
 * by the API with a message under the amount.
 */
export async function recordPaymentAction(
  invoiceId: string,
  patientId: string,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const { amount, payment_method, notes } = readPaymentForm(formData);
  const response = await sendApiJson(API_PATHS.invoices.payments(invoiceId), "POST", { amount, payment_method, notes });

  if (response?.status === 201) {
    revalidatePath(PATHS.finances.detail(invoiceId));
    revalidatePath(PATHS.finances.list());
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  return toFormState(response, "This treatment no longer exists.");
}
