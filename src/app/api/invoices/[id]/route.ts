import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository, PaymentRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import { UpdateInvoiceSchema } from "@/types/invoices";
import {
  UUID_REGEX,
  authenticate,
  canAccessClinic,
  checkModulePermission,
} from "@/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]
 *
 * Returns a single invoice with its payments and computed balance_due.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_view on "Invoices"
 *
 * Responses:
 *   200  { data: InvoiceWithPayments }
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Invoices", "can_view");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 });
  }

  const invoice = await InvoiceRepository.findByIdWithPayments(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return accessError;

  return NextResponse.json({ data: invoice }, { status: 200 });
}

/**
 * PATCH /api/invoices/[id]
 *
 * Partially updates an invoice.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_edit on "Invoices"
 *
 * Responses:
 *   200  { data: InvoiceModel }
 *   400  Invalid UUID / JSON
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 *   422  Validation error
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Invoices", "can_edit");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 });
  }

  const invoice = await InvoiceRepository.findById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return accessError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = UpdateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await InvoiceRepository.updateInvoice(id, parsed.data);
  return NextResponse.json({ data: updated }, { status: 200 });
}

/**
 * DELETE /api/invoices/[id]
 *
 * Soft-deletes an invoice (sets deleted_at).
 * Only allowed when no payments are recorded against it,
 * or by SuperAdmin regardless.
 *
 * Auth:          Required
 * Authorization: SuperAdmin, Admin, or Staff
 *   - Admin/Staff: auto-scoped to their clinic
 *   - Staff:       requires can_delete on "Invoices"
 *
 * Responses:
 *   204  (no body)
 *   400  Invalid UUID
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Not found
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { session, error } = await authenticate([
    UserRole.SuperAdmin,
    UserRole.Admin,
    UserRole.Staff,
  ]);
  if (error) return error;

  const caller = session.user;

  if (caller.role === UserRole.Staff) {
    const permError = await checkModulePermission(caller.id, "Invoices", "can_delete");
    if (permError) return permError;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid invoice ID format" }, { status: 400 });
  }

  const invoice = await InvoiceRepository.findById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const accessError = canAccessClinic(
    caller.role,
    caller.clinic_id,
    invoice.clinic_id,
    "Forbidden: Invoice belongs to a different clinic"
  );
  if (accessError) return accessError;

  await InvoiceRepository.deleteInvoice(id);
  return new NextResponse(null, { status: 204 });
}
