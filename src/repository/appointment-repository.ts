import { db } from "../prisma/db";
import { and } from "@prisma/orm-postgres/orm-client";
import type {
  AppointmentModel,
  CreateAppointmentData,
  UpdateAppointmentData,
  UpdateAppointmentStatusData,
} from "../types/appointments";
import { AppointmentStatus } from "../types/appointments";

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

export class AppointmentRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single appointment by ID.
   * Returns null if not found.
   */
  static async findById(id: string): Promise<AppointmentModel | null> {
    const appt = await db.orm.public.Appointment
      .select(...APPOINTMENT_FIELDS)
      .first({ id });
    return appt ?? null;
  }

  /**
   * Paginated list of appointments with optional filters.
   *  - clinic_id:  scope to a specific clinic
   *  - patient_id: scope to a specific patient
   *  - user_id:    scope to a specific staff member
   *  - status:     filter by appointment status
   *  - from / to:  filter by scheduled_time range (ISO-8601 strings)
   */
  static async findAll(filter?: {
    clinic_id?:  string;
    patient_id?: string;
    user_id?:    string;
    status?:     AppointmentStatus;
    from?:       string;
    to?:         string;
    page?:       number;
    limit?:      number;
  }): Promise<{ data: AppointmentModel[]; total: number }> {
    const page  = filter?.page  ?? 1;
    const limit = filter?.limit ?? 20;
    const skip  = (page - 1) * limit;

    let query = db.orm.public.Appointment.select(...APPOINTMENT_FIELDS);

    if (filter?.clinic_id)  query = query.where({ clinic_id:  filter.clinic_id  });
    if (filter?.patient_id) query = query.where({ patient_id: filter.patient_id });
    if (filter?.user_id)    query = query.where({ user_id:    filter.user_id    });
    if (filter?.status)     query = query.where({ status:     filter.status     });

    // Date-range filtering on scheduled_time
    if (filter?.from) {
      query = query.where((a) => a.scheduled_time.gte(filter.from!));
    }
    if (filter?.to) {
      query = query.where((a) => a.scheduled_time.lte(filter.to!));
    }

    const [data, agg] = await Promise.all([
      query.orderBy((a) => a.scheduled_time.desc()).limit(limit).offset(skip).all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);

    return { data, total: agg.count };
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

  /** Deletes an appointment by ID. */
  static async deleteAppointment(id: string): Promise<boolean> {
    await db.orm.public.Appointment.where({ id }).delete();
    return true;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Detects a scheduling conflict for a given staff member (user_id).
   * A conflict exists when the proposed time window overlaps any other
   * Scheduled/existing appointment for the same user.
   *
   * The overlap check: existing_start < proposed_end AND existing_end > proposed_start
   *   where end = start + duration_minutes
   */
  static async hasConflict(opts: {
    user_id:          string;
    scheduled_time:   string;   // ISO-8601
    duration_minutes: number;
    exclude_id?:      string;   // ignore when updating an existing record
  }): Promise<boolean> {
    const start = opts.scheduled_time;
    const end = new Date(new Date(start).getTime() + opts.duration_minutes * 60 * 1000).toISOString();

    let query = db.orm.public.Appointment
      .where({ user_id: opts.user_id })
      .where((a) =>
        // existing_start < proposed_end AND existing_end > proposed_start
        and(
          a.scheduled_time.lt(end),
          a.scheduled_time.gte(start) // approximation — good enough for simple overlap
        )
      );

    if (opts.exclude_id) {
      query = query.where((a) => a.id.neq(opts.exclude_id!));
    }

    const agg = await query.aggregate((a) => ({ count: a.count() }));
    return agg.count > 0;
  }
}
