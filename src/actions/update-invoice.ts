"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import type { InvoiceFormState } from "@/lib/finance-form";

/**
 * Server Action: updateInvoiceAction
 *
 * Bound to a treatment and its patient. Changes the title, total and due date
 * through PATCH /api/invoices/[id]; a total below what is already paid is
 * refused by the API (message under the total). An empty due date clears it.
 */
export async function updateInvoiceAction(
  invoiceId: string,
  patientId: string,
  _prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const text = (name: string) => ((formData.get(name) as string | null) ?? "").trim();
  const response = await sendApiJson(API_PATHS.invoices.detail(invoiceId), "PATCH", {
    title: text("title"),
    total_amount: text("total_amount"),
    due_date: text("due_date") || null,
  });

  if (response?.ok) {
    revalidatePath(PATHS.finances.detail(invoiceId));
    revalidatePath(PATHS.finances.list());
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  return toFormState(response, "This treatment no longer exists.");
}
