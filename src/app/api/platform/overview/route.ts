import { NextResponse } from "next/server";
import { PlatformRepository } from "@/repository/platform-repository";
import { UserRole } from "@/types/users";
import { authenticate } from "@/services";

/**
 * GET /api/platform/overview
 *
 * The whole platform at a glance: clinics, admins, staff and patients;
 * clinics per type; what was added this month (UTC); clinics without an
 * admin; the newest clinics (with their people and patients) and users.
 *
 * Auth:          Required
 * Authorization: SuperAdmin only
 *
 * Responses:
 *   200  { overview: PlatformOverview }
 *   401  Unauthorized
 *   403  Forbidden
 */
export async function GET() {
  const { error } = await authenticate([UserRole.SuperAdmin]);
  if (error) return error;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const overview = await PlatformRepository.overview(monthStart);
  return NextResponse.json({ overview }, { status: 200 });
}
