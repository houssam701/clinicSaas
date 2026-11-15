import { NextRequest, NextResponse } from "next/server";
import { ReportRepository } from "@/repository/report-repository";
import { ClinicRepository } from "@/repository/clinic-repository";
import { ReportQuerySchema } from "@/types/reports";
import { UserRole } from "@/types/users";
import { authenticateForModule } from "@/services";

/**
 * GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The clinic's figures for a period of whole days in its time zone (both
 * ends included, at most two years): money received (total and by method),
 * cost of treatments added, what is still owed today, new patients,
 * appointments by status, money per month for the last 12 months, and per
 * admin the visits they held and the money taken at them.
 *
 * Auth:          Required
 * Authorization: SuperAdmin (any clinic, ?clinic_id required), or Admin/Staff
 *                with can_view on "Reports" (always their own clinic)
 *
 * Responses:
 *   200  { report: ClinicReport }
 *   400  Invalid query parameters
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Clinic not found
 */
export async function GET(request: NextRequest) {
  const { session, error } = await authenticateForModule("Reports", "can_view");
  if (error) return error;

  const sp = request.nextUrl.searchParams;
  const parsed = ReportQuerySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    clinic_id: sp.get("clinic_id") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  const caller = session.user;
  const clinicId = caller.role === UserRole.SuperAdmin ? parsed.data.clinic_id : caller.clinic_id;
  if (!clinicId) {
    const message = caller.role === UserRole.SuperAdmin ? "Choose a clinic (clinic_id)." : "Forbidden: User is not associated with a clinic";
    return NextResponse.json({ error: message }, { status: caller.role === UserRole.SuperAdmin ? 400 : 403 });
  }

  const clinic = await ClinicRepository.findById(clinicId);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

  const report = await ReportRepository.clinicReport(clinic.id, clinic.timezone ?? "UTC", parsed.data.from, parsed.data.to);
  return NextResponse.json({ report }, { status: 200 });
}
