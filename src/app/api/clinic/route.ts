import { NextRequest, NextResponse } from "next/server";
import { ClinicRepository } from "@/repository/clinic-repository";
import { ClinicSettingsSchema } from "@/types/clinics";
import { UserRole } from "@/types/users";
import { authenticateForModule } from "@/services";
import type { AuthenticatedSession } from "@/services/api-guard";

/**
 * The caller's clinic id, or an error. Admins only: the SuperAdmin edits
 * clinics from the platform pages, and Staff never hold "Settings" (checked
 * here too, not only when access is saved).
 */
function ownClinic(session: AuthenticatedSession): { clinicId: string } | { error: NextResponse } {
  if (session.user.role === UserRole.SuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: Edit clinics from the platform pages" }, { status: 403 }) };
  }
  if (session.user.role !== UserRole.Admin || !session.user.clinic_id) {
    return { error: NextResponse.json({ error: "Forbidden: Only a clinic admin can open the clinic settings" }, { status: 403 }) };
  }
  return { clinicId: session.user.clinic_id };
}

/**
 * GET /api/clinic
 *
 * The caller's own clinic (name, type, time zone, currency).
 *
 * Auth:          Required
 * Authorization: Admin (role) with can_view on "Settings"
 *
 * Responses:
 *   200  { clinic: ClinicModel }
 *   401  Unauthorized
 *   403  Forbidden (no permission, or a SuperAdmin: use /api/clinics/[id])
 *   404  Clinic not found
 */
export async function GET() {
  const { session, error } = await authenticateForModule("Settings", "can_view");
  if (error) return error;
  const own = ownClinic(session);
  if ("error" in own) return own.error;

  const clinic = await ClinicRepository.findById(own.clinicId);
  if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  return NextResponse.json({ clinic }, { status: 200 });
}

/**
 * PATCH /api/clinic
 *
 * Updates the caller's own clinic: name, time zone, currency and appointment
 * reminders (on/off, days before). The clinic
 * type is the SuperAdmin's decision (it sets which clinical fields exist).
 * Changing the currency relabels amounts (no conversion); changing the time
 * zone keeps every appointment's moment and changes the hour shown.
 *
 * Auth:          Required
 * Authorization: Admin with can_edit on "Settings"
 * Body:          { name?, timezone? (IANA), currency? (ISO 4217),
 *                  reminders_enabled?: boolean, reminder_days_before?: 1–7 }
 *
 * Responses:
 *   200  { message, clinic: ClinicModel }
 *   400  Malformed JSON or validation error
 *   401  Unauthorized
 *   403  Forbidden
 *   404  Clinic not found
 *   409  Another clinic already has this name
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await authenticateForModule("Settings", "can_edit");
  if (error) return error;
  const own = ownClinic(session);
  if ("error" in own) return own.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Unknown keys (clinic_type included) are dropped by the schema, never applied
  const parsed = ClinicSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!(await ClinicRepository.findById(own.clinicId))) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }
  if (parsed.data.name) {
    const sameName = await ClinicRepository.findByName(parsed.data.name);
    if (sameName && sameName.id !== own.clinicId) {
      return NextResponse.json(
        { error: "A clinic with this name already exists.", details: { fieldErrors: { name: ["Another clinic already uses this name."] } } },
        { status: 409 }
      );
    }
  }

  const clinic = await ClinicRepository.updateClinic(own.clinicId, {
    name: parsed.data.name,
    timezone: parsed.data.timezone,
    currency: parsed.data.currency,
    reminders_enabled: parsed.data.reminders_enabled,
    reminder_days_before: parsed.data.reminder_days_before,
  });
  return NextResponse.json({ message: "Clinic updated", clinic }, { status: 200 });
}
