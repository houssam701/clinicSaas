import { db } from "../prisma/db";
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
   * Scheduled appointment for the same user.
   *
   * Full overlap condition:
   *   existing_start < proposed_end  AND  existing_end > proposed_start
   * where existing_end = existing_start + existing.duration_minutes.
   *
   * We push the first half of the predicate (existing_start < proposed_end)
   * to the database, then evaluate the second half in memory so we can use
   * each existing row's own duration_minutes to compute its end time.
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

    // Fetch all appointments for this user that start before the proposed slot ends.
    // (Rows that start at or after proposedEnd can never overlap.)
    let query = db.orm.public.Appointment
      .select("id", "scheduled_time", "duration_minutes")
      .where({ user_id: opts.user_id })
      .where((a) => a.scheduled_time.lt(proposedEndIso));

    if (opts.exclude_id) {
      query = query.where((a) => a.id.neq(opts.exclude_id!));
    }

    const candidates = await query.all();

    // Second half of overlap: existing appointment must end after proposedStart.
    return candidates.some((appt) => {
      const existingStart = new Date(appt.scheduled_time as string).getTime();
      const existingEnd   = existingStart + (appt.duration_minutes as number) * 60 * 1000;
      return existingEnd > proposedStart;
    });
  }
}
