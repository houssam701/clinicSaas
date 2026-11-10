"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

/**
 * Server Action: removePaymentAction
 *
 * DELETE /api/invoices/[id]/payments/[paymentId]: removes a payment recorded
 * by mistake (kept for audit) and refreshes the treatment's page.
 */
export async function removePaymentAction(invoiceId: string, paymentId: string): Promise<{ error?: string }> {
  const response = await sendApiJson(API_PATHS.invoices.payment(invoiceId, paymentId), "DELETE");
  if (!response) return { error: "Network error, please try again." };
  if (response.ok || response.status === 404) {
    revalidatePath(PATHS.finances.detail(invoiceId));
    revalidatePath(PATHS.finances.list());
    return {};
  }
  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not remove this payment. Please try again." };
}
