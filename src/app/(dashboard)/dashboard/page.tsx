import Link from "next/link";
import type { IconType } from "react-icons";
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineNoSymbol,
  HiOutlinePlus,
  HiOutlineUserPlus,
  HiOutlineUsers,
} from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { addDays, formatDay, formatTime, startOfWeek, todayIn, zonedTimeToUtc } from "@/lib/time-zone";
import { patientName } from "@/lib/patient-format";
import { nextScheduledId } from "@/lib/calendar-layout";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, type AppointmentWithPeople } from "@/types/appointments";
import { UserRole } from "@/types/users";
import { cn } from "@/lib/utils";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const primaryAction =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all";

const secondaryAction =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors";

interface Stat {
  label: string;
  value: number;
  icon: IconType;
  tone: string;
  href: string;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Link
      href={stat.href}
      className={`${card} group flex items-center gap-4 p-5 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${stat.tone}`}>
        <stat.icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-3xl font-black tracking-tight text-slate-800 dark:text-white tabular-nums">{stat.value}</span>
        <span className="block truncate text-sm font-medium text-slate-500 group-hover:text-primary dark:text-slate-400">
          {stat.label}
        </span>
      </span>
    </Link>
  );
}

/**
 * Server Component: Dashboard
 *
 * Today at a glance, from real data: the signed-in admin's own appointments
 * (Staff see the whole clinic, like the Appointments page) and the clinic's
 * patient count. Each number links to the page behind it, and only modules
 * the user can view are shown.
 */
export default async function DashboardPage() {
  const access = await loadMyAccess();
  const zone = access?.clinic?.timezone ?? "UTC";
  const today = todayIn(zone);
  const canAppointments = !!access?.grid.Appointments.can_view;
  const canPatients = !!access?.grid.Patients.can_view;
  const mine = access?.me.role === UserRole.Admin;
  const canBook = !!access?.grid.Appointments.can_create;
  const canAddPatient = !!access?.grid.Patients.can_create;

  // This week: Monday 00:00 to next Monday 00:00 in the clinic's zone
  const weekStart = startOfWeek(today);
  const weekFrom = zonedTimeToUtc(weekStart, "00:00", zone).toISOString();
  const weekTo = zonedTimeToUtc(addDays(weekStart, 7), "00:00", zone).toISOString();

  const [apptRes, patientsRes, weekApptRes, weekPatientsRes] = await Promise.all([
    canAppointments
      ? serverApiFetch(
          API_PATHS.appointments.list({
            from: zonedTimeToUtc(today, "00:00", zone).toISOString(),
            to: zonedTimeToUtc(addDays(today, 1), "00:00", zone).toISOString(),
            user_id: mine ? access!.me.id : undefined,
            limit: 200,
          })
        )
      : null,
    canPatients ? serverApiFetch(API_PATHS.patients.list({ limit: 1 })) : null,
    // Only the totals are needed, so one row per list is enough
    canAppointments
      ? serverApiFetch(API_PATHS.appointments.list({ from: weekFrom, to: weekTo, user_id: mine ? access!.me.id : undefined, limit: 1 }))
      : null,
    canPatients ? serverApiFetch(API_PATHS.patients.list({ created_from: weekFrom, limit: 1 })) : null,
  ]);
  const { total: weekAppointments = 0 }: { total?: number } = weekApptRes?.ok ? await weekApptRes.json() : {};
  const { total: weekNewPatients = 0 }: { total?: number } = weekPatientsRes?.ok ? await weekPatientsRes.json() : {};
  const { appointments = [] }: { appointments?: AppointmentWithPeople[] } = apptRes?.ok ? await apptRes.json() : {};
  const { total: patientTotal = 0 }: { total?: number } = patientsRes?.ok ? await patientsRes.json() : {};

  const count = (status: AppointmentStatus) => appointments.filter((a) => a.status === status).length;
  // The next one: the first scheduled appointment that has not ended yet
  const nextId = nextScheduledId(appointments);
  const todayHref = PATHS.appointments.list({ view: "list", mode: "day", date: today });

  const weekStats: Stat[] = [
    ...(canAppointments
      ? [{ label: mine ? "Your appointments this week" : "Appointments this week", value: weekAppointments, icon: HiOutlineCalendarDays, tone: "bg-blue-100 text-primary dark:bg-blue-950/60", href: PATHS.appointments.list({ view: "calendar", mode: "week", date: today }) }]
      : []),
    ...(canPatients
      ? [{ label: "New patients this week", value: weekNewPatients, icon: HiOutlineUserPlus, tone: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400", href: PATHS.patients.list() }]
      : []),
  ];

  const stats: Stat[] = [
    ...(canAppointments
      ? [
          { label: "Still to come today", value: count(AppointmentStatus.Scheduled), icon: HiOutlineClock, tone: "bg-blue-100 text-primary dark:bg-blue-950/60", href: todayHref },
          { label: "Completed today", value: count(AppointmentStatus.Completed), icon: HiOutlineCheckCircle, tone: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400", href: PATHS.appointments.list({ view: "list", mode: "day", date: today, status: AppointmentStatus.Completed }) },
          { label: "No-shows today", value: count(AppointmentStatus.NoShow), icon: HiOutlineNoSymbol, tone: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400", href: PATHS.appointments.list({ view: "list", mode: "day", date: today, status: AppointmentStatus.NoShow }) },
        ]
      : []),
    ...(canPatients
      ? [{ label: "Patients in your clinic", value: patientTotal, icon: HiOutlineUsers, tone: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400", href: PATHS.patients.list() }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Today</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {formatDay(today, "long")}
            {canAppointments && ` · ${mine ? "your appointments" : "the clinic's appointments"}`}
          </p>
        </div>
        {(canBook || canAddPatient) && (
          <div className="flex flex-wrap items-center gap-2">
            {canAddPatient && (
              <Link href={PATHS.patients.new} className={secondaryAction}>
                <HiOutlineUserPlus aria-hidden="true" className="h-4 w-4" />
                New patient
              </Link>
            )}
            {canBook && (
              <Link href={PATHS.appointments.new({ back: PATHS.dashboard })} className={primaryAction}>
                <HiOutlinePlus aria-hidden="true" className="h-4 w-4" />
                New appointment
              </Link>
            )}
          </div>
        )}
      </div>

      {stats.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">Nothing to show here yet.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin to give you access to Appointments or Patients.</p>
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      )}

      {canAppointments && (
        <section className={card}>
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <h2 className="font-bold text-slate-800 dark:text-white">Today&apos;s schedule</h2>
            <Link href={todayHref} className="text-sm font-semibold text-primary hover:underline">
              View in Appointments
            </Link>
          </header>
          {appointments.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nothing booked for today.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {appointments.map((appt) => {
                const status = appt.status as AppointmentStatus;
                const isNext = appt.id === nextId;
                return (
                  <li key={appt.id}>
                    <Link
                      href={PATHS.appointments.edit(appt.id, { back: PATHS.dashboard })}
                      prefetch={false}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40",
                        isNext && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <span className="w-14 shrink-0 text-sm font-bold tabular-nums text-slate-800 dark:text-white">
                        {formatTime(appt.scheduled_time, zone)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-800 dark:text-white">
                          {appt.patient ? patientName(appt.patient) : "Unknown patient"}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {[mine ? null : appt.staff ? patientName(appt.staff) : "Unassigned", `${appt.duration_minutes} min`, appt.reason_for_visit]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {isNext && (
                        <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-white">Next</span>
                      )}
                      <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-bold", STATUS_STYLE[status].badge)}>
                        {APPOINTMENT_STATUS_LABELS[status]}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {weekStats.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-800 dark:text-white">
            This week{" "}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {formatDay(weekStart)} – {formatDay(addDays(weekStart, 6))}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {weekStats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
