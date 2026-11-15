import { db } from "../prisma/db";
import { ClinicType } from "../types/clinics";
import { UserRole } from "../types/users";
import type { OverviewClinic, OverviewUser, PlatformOverview } from "../types/platform";

/** How many recent clinics and users the overview shows. */
const RECENT = 5;

/**
 * Platform-wide figures for the SuperAdmin's overview. Counts are computed in
 * the database; only the few recent rows are loaded.
 */
export class PlatformRepository {
  static async overview(monthStart: string): Promise<PlatformOverview> {
    const noAdmin = () =>
      db.orm.public.Clinic.where((c) => c.users.none((u) => u.role.eq(UserRole.Admin)));

    const [clinics, usersByRole, patients, byType, newClinics, newPatients, newAppointments, withoutAdminCount, withoutAdmin, recentClinics, recentUsers] =
      await Promise.all([
        db.orm.public.Clinic.aggregate((a) => ({ count: a.count() })),
        db.orm.public.User.groupBy("role").aggregate((a) => ({ count: a.count() })),
        db.orm.public.Patient.aggregate((a) => ({ count: a.count() })),
        db.orm.public.Clinic.groupBy("clinic_type").aggregate((a) => ({ count: a.count() })),
        db.orm.public.Clinic.where((c) => c.created_at.gte(monthStart)).aggregate((a) => ({ count: a.count() })),
        db.orm.public.Patient.where((p) => p.created_at.gte(monthStart)).aggregate((a) => ({ count: a.count() })),
        db.orm.public.Appointment.where((a) => a.scheduled_time.gte(monthStart)).aggregate((a) => ({ count: a.count() })),
        noAdmin().aggregate((a) => ({ count: a.count() })),
        noAdmin().select("id", "name").orderBy((c) => c.created_at.desc()).limit(RECENT).all(),
        db.orm.public.Clinic
          .select("id", "name", "clinic_type", "created_at")
          .orderBy((c) => c.created_at.desc())
          .limit(RECENT)
          .all(),
        db.orm.public.User
          .select("id", "first_name", "last_name", "role", "clinic_id", "created_at")
          .where((u) => u.role.neq(UserRole.SuperAdmin))
          .orderBy((u) => u.created_at.desc())
          .limit(RECENT)
          .all(),
      ]);

    // People and patients of the recent clinics, plus the names of the recent users' clinics
    const clinicIds = recentClinics.map((c) => c.id);
    const userClinicIds = [...new Set(recentUsers.map((u) => u.clinic_id).filter((id): id is string => !!id))];
    const [staffCounts, patientCounts, userClinics] = await Promise.all([
      clinicIds.length
        ? db.orm.public.User.where((u) => u.clinic_id.in(clinicIds)).groupBy("clinic_id", "role").aggregate((a) => ({ count: a.count() }))
        : [],
      clinicIds.length
        ? db.orm.public.Patient.where((p) => p.clinic_id.in(clinicIds)).groupBy("clinic_id").aggregate((a) => ({ count: a.count() }))
        : [],
      userClinicIds.length ? db.orm.public.Clinic.select("id", "name").where((c) => c.id.in(userClinicIds)).all() : [],
    ]);

    const peopleOf = (clinicId: string, role: UserRole) =>
      staffCounts.find((r) => r.clinic_id === clinicId && r.role === role)?.count ?? 0;
    const roleCount = (role: UserRole) => usersByRole.find((r) => r.role === role)?.count ?? 0;

    const recent_clinics: OverviewClinic[] = recentClinics.map((c) => ({
      ...c,
      clinic_type: c.clinic_type as ClinicType,
      admins: peopleOf(c.id, UserRole.Admin),
      staff: peopleOf(c.id, UserRole.Staff),
      patients: patientCounts.find((r) => r.clinic_id === c.id)?.count ?? 0,
    }));
    const recent_users: OverviewUser[] = recentUsers.map(({ clinic_id, ...u }) => ({
      ...u,
      role: u.role as UserRole,
      clinic: userClinics.find((c) => c.id === clinic_id) ?? null,
    }));

    return {
      totals: { clinics: clinics.count, admins: roleCount(UserRole.Admin), staff: roleCount(UserRole.Staff), patients: patients.count },
      clinics_by_type: Object.values(ClinicType).map((clinic_type) => ({
        clinic_type,
        count: byType.find((r) => r.clinic_type === clinic_type)?.count ?? 0,
      })),
      this_month: { clinics: newClinics.count, patients: newPatients.count, appointments: newAppointments.count },
      without_admin: { count: withoutAdminCount.count, clinics: withoutAdmin },
      recent_clinics,
      recent_users,
    };
  }
}
