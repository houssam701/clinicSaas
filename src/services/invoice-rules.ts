import { NextResponse } from "next/server";
import { InvoiceRepository } from "../repository/invoice-repository";
import { UUID_REGEX, authenticateForModule, canAccessClinic, type AuthenticatedSession } from "./api-guard";
import type { PermissionAction } from "../config/permissions";
import type { InvoiceSummary } from "../types/invoices";

export type InvoiceAccess =
  | { session: AuthenticatedSession; invoice: InvoiceSummary; error: null }
  | { session: null; invoice: null; error: NextResponse };

/**
 * The checks every /api/invoices/[id]/** handler starts with: signed in,
 * `action` on "Finances" (the SuperAdmin skips it), a valid id, an existing
 * (not deleted) invoice, and the caller's own clinic.
 */
export async function authorizeInvoice(id: string, action: PermissionAction): Promise<InvoiceAccess> {
  const fail = (error: NextResponse): InvoiceAccess => ({ session: null, invoice: null, error });

  const { session, error } = await authenticateForModule("Finances", action);
  if (error) return fail(error);

  if (!UUID_REGEX.test(id)) return fail(NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 }));
  const invoice = await InvoiceRepository.findById(id);
  if (!invoice) return fail(NextResponse.json({ error: "Invoice not found" }, { status: 404 }));

  const accessError = canAccessClinic(
    session.user.role,
    session.user.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return fail(accessError);

  return { session, invoice, error: null };
}

/** 422 with one field error, in the shape the forms read. */
export const invoiceFieldError = (field: string, message: string) =>
  NextResponse.json({ error: "Validation failed", details: { fieldErrors: { [field]: [message] } } }, { status: 422 });
