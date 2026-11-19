import { db } from "../prisma/db";
import { AppointmentStatus } from "../types/appointments";
import { MAX_REMINDER_DAYS } from "../config/reminders";

export interface DueReminder {
  id: string;
  scheduled_time: string;
  clinic: { name: string; timezone: string } | null;
  patient: { first_name: string; email: string | null } | null;
  staff: { first_name: string; last_name: string } | null;
}

/** Appointments whose reminder email is due, and the one-time claim on each. */
export class ReminderRepository {
  /**
   * Up to `limit` scheduled visits that still need a reminder: their clinic
   * has reminders on, the patient has an email, and the visit starts between
   * `earliest` and the clinic's "days before" from `now`. One small indexed
   * query per possible setting (1–7 days), soonest visits first.
   */
  static async due(now: Date, earliest: Date, limit: number): Promise<DueReminder[]> {
    const out: DueReminder[] = [];
    for (let days = 1; days <= MAX_REMINDER_DAYS && out.length < limit; days++) {
      const latest = new Date(now.getTime() + days * 86_400_000).toISOString();
      const rows = await db.orm.public.Appointment
        .select("id", "scheduled_time")
        .where({ status: AppointmentStatus.Scheduled })
        .where((a) => a.reminder_sent_at.isNull())
        .where((a) => a.scheduled_time.gte(earliest.toISOString()))
        .where((a) => a.scheduled_time.lte(latest))
        .where((a) => a.clinic.some((c) => c.reminders_enabled.eq(true)))
        .where((a) => a.clinic.some((c) => c.reminder_days_before.eq(days)))
        .where((a) => a.patient.some((p) => p.email.isNotNull()))
        .where((a) => a.patient.some((p) => p.email.neq("")))
        .where((a) => a.patient.some((p) => p.deleted_at.isNull()))
        .include("clinic", (c) => c.select("name", "timezone"))
        .include("patient", (p) => p.select("first_name", "email"))
        .include("staff", (s) => s.select("first_name", "last_name"))
        .orderBy((a) => a.scheduled_time.asc())
        .limit(limit - out.length)
        .all();
      out.push(...(rows as unknown as DueReminder[]));
    }
    return out;
  }

  /**
   * Marks the reminder as sent, only if nobody did yet (a conditional update):
   * two runs at the same time can never email the same patient twice.
   * True when this caller got it.
   */
  static async claim(id: string, at: string): Promise<boolean> {
    const count = await db.orm.public.Appointment
      .where({ id, status: AppointmentStatus.Scheduled })
      .where((a) => a.reminder_sent_at.isNull())
      .updateAndCount({ reminder_sent_at: at });
    return count === 1;
  }

  /** Gives a claim back after a temporary failure, so the next run retries. */
  static async release(id: string): Promise<void> {
    await db.orm.public.Appointment.where({ id }).updateAndCount({ reminder_sent_at: null });
  }
}
