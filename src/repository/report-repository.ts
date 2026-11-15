import { db } from "../prisma/db";
import { fromCents, toCents } from "../lib/money";
import { addDays, zonedTimeToUtc } from "../lib/time-zone";
import { monthStart } from "../lib/report-range";
import { InvoiceRepository } from "./invoice-repository";
import { PaymentMethod } from "../types/invoices";
import { AppointmentStatus } from "../types/appointments";
import { UserRole } from "../types/users";
import type { ClinicReport, ReportProviderRow } from "../types/reports";

const cents = (v: string | null | undefined) => (v ? toCents(v) : 0);

/**
 * Clinic-wide figures for the Reports page. Every number is computed in the
 * database (sums and counts, never loading rows); a period is whole days in
 * the clinic's time zone, both ends included.
 */
export class ReportRepository {
  static async clinicReport(clinicId: string, zone: string, from: string, to: string): Promise<ClinicReport> {
    const start = zonedTimeToUtc(from, "00:00", zone).toISOString();
    const end = zonedTimeToUtc(addDays(to, 1), "00:00", zone).toISOString();

    // Payments received in [start, end), not deleted, on treatments that still exist
    const payments = () =>
      db.orm.public.Payment
        .where({ clinic_id: clinicId })
        .where((p) => p.deleted_at.isNull())
        .where((p) => p.invoice.some((i) => i.deleted_at.isNull()))
        .where((p) => p.payment_date.gte(start))
        .where((p) => p.payment_date.lt(end));

    // The 12 months ending with the period's last month
    const firstMonth = monthStart(to, -11);
    const monthBounds = Array.from({ length: 13 }, (_, i) => monthStart(firstMonth, i));

    const [collected, byMethod, billed, summary, newPatients, apptByUser, admins, noVisit, months] = await Promise.all([
      payments().aggregate((a) => ({ sum: a.sum("amount"), count: a.count() })),
      payments().groupBy("payment_method").aggregate((a) => ({ sum: a.sum("amount"), count: a.count() })),
      db.orm.public.Invoice
        .where({ clinic_id: clinicId })
        .where((i) => i.deleted_at.isNull())
        .where((i) => i.created_at.gte(start))
        .where((i) => i.created_at.lt(end))
        .aggregate((a) => ({ sum: a.sum("total_amount") })),
      InvoiceRepository.summary(clinicId, start),
      db.orm.public.Patient
        .where({ clinic_id: clinicId })
        .where((p) => p.created_at.gte(start))
        .where((p) => p.created_at.lt(end))
        .aggregate((a) => ({ count: a.count() })),
      db.orm.public.Appointment
        .where({ clinic_id: clinicId })
        .where((a) => a.scheduled_time.gte(start))
        .where((a) => a.scheduled_time.lt(end))
        .groupBy("user_id", "status")
        .aggregate((a) => ({ count: a.count() })),
      db.orm.public.User
        .select("id", "first_name", "last_name")
        .where({ clinic_id: clinicId, role: UserRole.Admin })
        .orderBy((u) => u.first_name.asc())
        .all(),
      payments().where((p) => p.appointment_id.isNull()).aggregate((a) => ({ sum: a.sum("amount") })),
      Promise.all(
        monthBounds.slice(0, 12).map((month, i) =>
          db.orm.public.Payment
            .where({ clinic_id: clinicId })
            .where((p) => p.deleted_at.isNull())
            .where((p) => p.invoice.some((inv) => inv.deleted_at.isNull()))
            .where((p) => p.payment_date.gte(zonedTimeToUtc(month, "00:00", zone).toISOString()))
            .where((p) => p.payment_date.lt(zonedTimeToUtc(monthBounds[i + 1], "00:00", zone).toISOString()))
            .aggregate((a) => ({ sum: a.sum("amount") }))
        )
      ),
    ]);

    // Money taken at each admin's visits (one sum per admin; a clinic has few admins)
    const perAdmin = await Promise.all(
      admins.map((u) =>
        payments()
          .where((p) => p.appointment.some((a) => a.user_id.eq(u.id)))
          .aggregate((a) => ({ sum: a.sum("amount") }))
      )
    );

    // Appointment counts per holder (null = unassigned)
    const counts = new Map<string | null, { appointments: number; completed: number; no_show: number }>();
    const byStatus: Record<AppointmentStatus, number> = {
      [AppointmentStatus.Scheduled]: 0,
      [AppointmentStatus.Completed]: 0,
      [AppointmentStatus.Canceled]: 0,
      [AppointmentStatus.NoShow]: 0,
    };
    for (const row of apptByUser) {
      const key = row.user_id ?? null;
      const c = counts.get(key) ?? { appointments: 0, completed: 0, no_show: 0 };
      c.appointments += row.count;
      if (row.status === AppointmentStatus.Completed) c.completed += row.count;
      if (row.status === AppointmentStatus.NoShow) c.no_show += row.count;
      counts.set(key, c);
      byStatus[row.status as AppointmentStatus] += row.count;
    }
    const none = { appointments: 0, completed: 0, no_show: 0 };

    const providers: ReportProviderRow[] = admins.map((user, i) => ({
      user,
      kind: "admin",
      collected: fromCents(cents(perAdmin[i].sum)),
      ...(counts.get(user.id) ?? none),
    }));
    // Visits nobody held, or held by someone who is no longer an admin, count as unassigned
    const known = new Set(admins.map((u) => u.id));
    const others = [...counts.entries()].filter(([id]) => !known.has(id as string));
    const otherCounts = others.reduce(
      (s, [, c]) => ({ appointments: s.appointments + c.appointments, completed: s.completed + c.completed, no_show: s.no_show + c.no_show }),
      none
    );
    const assignedToAdmins = perAdmin.reduce((s, r) => s + cents(r.sum), 0);
    const unassignedCents = cents(collected.sum) - cents(noVisit.sum) - assignedToAdmins;
    if (otherCounts.appointments > 0 || unassignedCents > 0) {
      providers.push({ user: null, kind: "unassigned", collected: fromCents(unassignedCents), ...otherCounts });
    }
    if (cents(noVisit.sum) > 0) {
      providers.push({ user: null, kind: "no_visit", collected: fromCents(cents(noVisit.sum)), ...none });
    }

    return {
      from,
      to,
      collected: {
        total: fromCents(cents(collected.sum)),
        count: collected.count,
        by_method: Object.values(PaymentMethod)
          .map((method) => {
            const row = byMethod.find((r) => r.payment_method === method);
            return { method, amount: fromCents(cents(row?.sum)), count: row?.count ?? 0 };
          })
          .filter((r) => r.count > 0),
      },
      billed: fromCents(cents(billed.sum)),
      outstanding: summary.outstanding,
      new_patients: newPatients.count,
      appointments: { total: apptByUser.reduce((s, r) => s + r.count, 0), by_status: byStatus },
      months: months.map((m, i) => ({ month: monthBounds[i].slice(0, 7), collected: fromCents(cents(m.sum)) })),
      providers,
    };
  }
}

