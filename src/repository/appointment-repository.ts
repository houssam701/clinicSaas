import { db } from "../prisma/db";
import { or } from "@prisma/orm-postgres/orm-client";
import { searchPatterns } from "../lib/search-words";
import type {
  AppointmentModel,
  AppointmentStaffMember,
  AppointmentWithPeople,
  CreateAppointmentData,
  UpdateAppointmentData,
  UpdateAppointmentStatusData,
} from "../types/appointments";
import { AppointmentStatus } from "../types/appointments";
import { pageOffset, type PaginatedResult } from "../types/pagination";
import { UserRole } from "../types/users";

// ─── Appointment Repository ───────────────────────────────────────────────────

const APPOINTMENT_FIELDS = [
  "id",
  "clinic_id",
  "patient_id",
  "user_id",
  "scheduled_time",
  "duration_minutes",
  "status",
  "reason_for_visit",
  "created_at",
  "updated_at",
] as const;

const PERSON_FIELDS = ["id", "first_name", "last_name"] as const;

export type AppointmentListFilter = {
  clinic_id?:  string;
  patient_id?: string;
  /** A staff member's id, or "unassigned" */
  user_id?:    string;
  status?:     AppointmentStatus;
  /** Every word must match the patient (name, phone, email), the admin's name or the reason */
  search?:     string;
  from?:       string;
  to?:         string;
  sort:        "asc" | "desc";
  page:        number;
  limit:       number;
};

export class AppointmentRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /** One appointment with its patient and staff names, or null. */
  static async findById(id: string): Promise<AppointmentWithPeople | null> {
    const appt = await db.orm.public.Appointment
      .select(...APPOINTMENT_FIELDS)
      .include("patient", (p) => p.select(...PERSON_FIELDS))
      .include("staff", (s) => s.select(...PERSON_FIELDS))
      .first({ id });
    return (appt as AppointmentWithPeople | null) ?? null;
  }

  /**
   * One page of appointments with patient and staff names, ordered by start
   * time. `from` is inclusive, `to` exclusive, so consecutive ranges never
   * show an appointment twice.
   */
  static async findPage(filter: AppointmentListFilter): Promise<PaginatedResult<AppointmentWithPeople>> {
    let query = db.orm.public.Appointment.select(...APPOINTMENT_FIELDS);

    if (filter.clinic_id)  query = query.where({ clinic_id:  filter.clinic_id  });
    if (filter.patient_id) query = query.where({ patient_id: filter.patient_id });
    if (filter.status)     query = query.where({ status:     filter.status     });
    if (filter.user_id === "unassigned") query = query.where((a) => a.user_id.isNull());
    else if (filter.user_id)             query = query.where({ user_id: filter.user_id });
    if (filter.from) query = query.where((a) => a.scheduled_time.gte(filter.from!));
    if (filter.to)   query = query.where((a) => a.scheduled_time.lt(filter.to!));
    for (const pattern of searchPatterns(filter.search)) {
      query = query.where((a) =>
        or(
          a.reason_for_visit.ilike(pattern),
          a.patient.some((p) =>
            or(p.first_name.ilike(pattern), p.last_name.ilike(pattern), p.phone.ilike(pattern), p.email.ilike(pattern))
          ),
          a.staff.some((s) => or(s.first_name.ilike(pattern), s.last_name.ilike(pattern)))
        )
      );
    }

    const [data, agg] = await Promise.all([
      query
        .include("patient", (p) => p.select(...PERSON_FIELDS))
        .include("staff", (s) => s.select(...PERSON_FIELDS))
        .orderBy((a) => (filter.sort === "desc" ? a.scheduled_time.desc() : a.scheduled_time.asc()))
        .limit(filter.limit)
        .offset(pageOffset(filter))
        .all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);

    return { data: data as AppointmentWithPeople[], total: agg.count };
  }

  /**
   * The Admins of a clinic, A–Z: the people appointments are held with (the
   * calendar's columns and the form's "With" choices). Staff (reception,
   * assistants) never hold appointments.
   */
  static async findClinicProviders(clinicId: string): Promise<AppointmentStaffMember[]> {
    return await db.orm.public.User
      .select(...PERSON_FIELDS, "role")
      .where({ clinic_id: clinicId, role: UserRole.Admin })
      .orderBy((u) => u.first_name.asc())
      .all();
  }

  /** Whether `userId` is an Admin of `clinicId` (only Admins hold appointments). */
  static async isClinicProvider(userId: string, clinicId: string): Promise<boolean> {
    const result = await db.orm.public.User
      .where({ id: userId, clinic_id: clinicId, role: UserRole.Admin })
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /** Creates and returns a new appointment. */
  static async createAppointment(data: CreateAppointmentData): Promise<AppointmentModel> {
    return db.orm.public.Appointment
      .select(...APPOINTMENT_FIELDS)
      .create(data);
  }

  /** Updates an appointment by ID; returns the updated record or null if not found. */
  static async updateAppointment(
    id:   string,
    data: UpdateAppointmentData
  ): Promise<AppointmentModel | null> {
    const updated = await db.orm.public.Appointment
      .where({ id })
      .select(...APPOINTMENT_FIELDS)
      .update(data);
    return updated ?? null;
  }

  /** Updates only the status field of an appointment. */
  static async updateStatus(
    id:   string,
    data: UpdateAppointmentStatusData
  ): Promise<AppointmentModel | null> {
    const updated = await db.orm.public.Appointment
      .where({ id })
      .select(...APPOINTMENT_FIELDS)
      .update(data);
    return updated ?? null;
  }

  /**
   * Deletes an appointment. Invoices that referenced it are kept (financial
   * records) and simply lose the link, so the foreign key never blocks the delete.
   */
  static async deleteAppointment(id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.orm.public.Invoice.where({ appointment_id: id }).updateAndCount({ appointment_id: null });
      await tx.orm.public.Appointment.where({ id }).delete();
      return true;
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Detects a scheduling conflict for a given staff member (user_id).
   * A conflict exists when the proposed time window overlaps any other
   * Scheduled appointment of the same user (canceled and no-show ones free
   * their slot).
   *
   * Full overlap condition:
   *   existing_start < proposed_end  AND  existing_end > proposed_start
   * where existing_end = existing_start + existing.duration_minutes.
   *
   * The first half is pushed to the database (bounded below by the longest
   * allowed duration); the second half uses each row's own duration.
   */
  static async hasConflict(opts: {
    user_id:          string;
    scheduled_time:   string;   // ISO-8601
    duration_minutes: number;
    exclude_id?:      string;   // ignore when updating an existing record
  }): Promise<boolean> {
    const proposedStart = new Date(opts.scheduled_time).getTime();
    const proposedEnd   = proposedStart + opts.duration_minutes * 60 * 1000;
    const proposedEndIso = new Date(proposedEnd).toISOString();
    // No appointment lasts more than 10 hours (DurationSchema), so older rows cannot overlap
    const earliestStartIso = new Date(proposedStart - 10 * 60 * 60 * 1000).toISOString();

    let query = db.orm.public.Appointment
      .select("id", "scheduled_time", "duration_minutes")
      .where({ user_id: opts.user_id, status: AppointmentStatus.Scheduled })
      .where((a) => a.scheduled_time.lt(proposedEndIso))
      .where((a) => a.scheduled_time.gt(earliestStartIso));

    if (opts.exclude_id) {
      query = query.where((a) => a.id.neq(opts.exclude_id!));
    }

    const candidates = await query.all();

    return candidates.some((appt) => {
      const existingStart = new Date(appt.scheduled_time as string).getTime();
      const existingEnd   = existingStart + (appt.duration_minutes as number) * 60 * 1000;
      return existingEnd > proposedStart;
    });
  }
}
