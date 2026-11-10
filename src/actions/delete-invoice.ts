"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

/**
 * Server Action: deleteInvoiceAction
 *
 * DELETE /api/invoices/[id]: hides the treatment and its payments (kept in
 * the database for audit).
 */
export async function deleteInvoiceAction(invoiceId: string): Promise<{ error?: string }> {
  const response = await sendApiJson(API_PATHS.invoices.detail(invoiceId), "DELETE");
  if (!response) return { error: "Network error, please try again." };
  if (response.status === 204 || response.status === 404) {
    revalidatePath(PATHS.finances.list());
    return {};
  }
  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not delete this treatment. Please try again." };
}
