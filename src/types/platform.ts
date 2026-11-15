import type { ClinicType } from "./clinics";
import type { UserRole } from "./users";

/** A clinic on the overview, with how many people and patients it has. */
export interface OverviewClinic {
  id: string;
  name: string;
  clinic_type: ClinicType;
  created_at: string;
  admins: number;
  staff: number;
  patients: number;
}

export interface OverviewUser {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  clinic: { id: string; name: string } | null;
  created_at: string;
}

/** GET /api/platform/overview: the whole platform at a glance (SuperAdmin). */
export interface PlatformOverview {
  totals: { clinics: number; admins: number; staff: number; patients: number };
  clinics_by_type: { clinic_type: ClinicType; count: number }[];
  /** Since the start of this month (UTC): the platform has no single time zone */
  this_month: { clinics: number; patients: number; appointments: number };
  /** Clinics nobody can manage yet: no Admin. `count` is all of them, `clinics` the newest few */
  without_admin: { count: number; clinics: { id: string; name: string }[] };
  recent_clinics: OverviewClinic[];
  recent_users: OverviewUser[];
}
