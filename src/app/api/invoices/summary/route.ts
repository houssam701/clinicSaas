import { NextRequest, NextResponse } from "next/server";
import { InvoiceRepository } from "@/repository/invoice-repository";
import { UserRole } from "@/types/users";
import { z } from "@/lib/zod";
import { authenticateForModule } from "@/services";

const SummaryQuerySchema = z.object({
  from: z.iso.datetime({ offset: true, error: "from must be a valid date and time." }),
  clinic_id: z.string().uuid().optional(),
});

/**
 * GET /api/invoices/summary?from=<instant>
 *
 * The clinic's money at a glance: what is still owed on open invoices
 * (Unpaid or Partial), and what was collected since `from`.
 *
 * Auth:          Required
 * Authorization: SuperAdmin (any clinic via ?clinic_id), or Admin/Staff with
 *                can_view on "Finances" (always their own clinic)
 *
 * Responses:
 *   200  { outstanding: "1500.00", collected: "320.00" }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function GET(request: NextRequest) {
  const { session, error } = await authenticateForModule("Finances", "can_view");
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const parsed = SummaryQuerySchema.safeParse({ from: sp.get("from") ?? undefined, clinic_id: sp.get("clinic_id") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  const caller = session.user;
  if (caller.role !== UserRole.SuperAdmin && !caller.clinic_id) {
    return NextResponse.json({ error: "Forbidden: User is not associated with a clinic" }, { status: 403 });
  }
  const clinicId = caller.role === UserRole.SuperAdmin ? parsed.data.clinic_id : caller.clinic_id!;

  const summary = await InvoiceRepository.summary(clinicId, parsed.data.from);
  return NextResponse.json(summary, { status: 200 });
}
