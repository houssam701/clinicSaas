import Link from "next/link";
import { HiOutlineCalendarDays, HiOutlinePlus } from "react-icons/hi2";
import { PATHS } from "@/config/path";
import { formatDay, formatTime, zonedParts } from "@/lib/time-zone";
import { patientName } from "@/lib/patient-format";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, type AppointmentWithPeople } from "@/types/appointments";
import { cn } from "@/lib/utils";

/** How many appointments each list shows before "See all". */
export const PATIENT_APPOINTMENTS_SHOWN = 5;

export interface PatientAppointmentsProps {
  patientId: string;
  upcoming: AppointmentWithPeople[];
  upcomingTotal: number;
  past: AppointmentWithPeople[];
  pastTotal: number;
  zone: string;
  canBook: boolean;
  /** The patient page, so the form and the appointment come back here */
  back: string;
  error: boolean;
}

function Row({ appt, zone, back, highlight }: { appt: AppointmentWithPeople; zone: string; back: string; highlight?: boolean }) {
  const status = appt.status as AppointmentStatus;
  return (
    <li>
      <Link
        href={PATHS.appointments.edit(appt.id, { back })}
        prefetch={false}
        className={cn(
          "flex items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40",
          highlight && "bg-primary/5 hover:bg-primary/10"
        )}
      >
        <span className="w-28 shrink-0 tabular-nums">
          <span className="block text-sm font-bold text-slate-800 dark:text-white">
            {formatDay(zonedParts(new Date(appt.scheduled_time), zone).date)}
          </span>
          <span className="block text-xs text-slate-500">{formatTime(appt.scheduled_time, zone)}</span>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
          {[appt.staff ? patientName(appt.staff) : "Unassigned", appt.reason_for_visit].filter(Boolean).join(" · ")}
        </span>
        {highlight && <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-white">Next</span>}
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-bold", STATUS_STYLE[status].badge)}>
          {APPOINTMENT_STATUS_LABELS[status]}
        </span>
      </Link>
    </li>
  );
}

function Group({
  title,
  items,
  total,
  seeAllHref,
  empty,
  zone,
  back,
  nextId,
}: {
  title: string;
  items: AppointmentWithPeople[];
  total: number;
  seeAllHref: string;
  empty: string;
  zone: string;
  back: string;
  nextId?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title} {total > 0 && <span className="text-slate-400">· {total}</span>}
        </h3>
        {total > items.length && (
          <Link href={seeAllHref} className="text-xs font-semibold text-primary hover:underline">
            See all
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-6 pb-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((appt) => (
            <Row key={appt.id} appt={appt} zone={zone} back={back} highlight={appt.id === nextId} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The patient's appointments on their page: what is coming (the first
 * scheduled one marked "Next") and what happened, a few of each, with
 * "See all" opening the Appointments list for this patient.
 */
export function PatientAppointments({
  patientId,
  upcoming,
  upcomingTotal,
  past,
  pastTotal,
  zone,
  canBook,
  back,
  error,
}: PatientAppointmentsProps) {
  const nextId = upcoming.find((a) => a.status === AppointmentStatus.Scheduled)?.id;
  const listFor = (mode: "upcoming" | "past") => PATHS.appointments.list({ view: "list", mode, patient: patientId });

  return (
    <section className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <h2 className="flex items-center gap-3 font-bold text-slate-800 dark:text-white">
          <HiOutlineCalendarDays aria-hidden="true" className="h-5 w-5 text-primary" />
          Appointments
        </h2>
        {canBook && (
          <Link
            href={PATHS.appointments.new({ patient: patientId, back })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
          >
            <HiOutlinePlus aria-hidden="true" className="h-3.5 w-3.5" />
            Book appointment
          </Link>
        )}
      </header>

      {error ? (
        <p className="p-6 text-center text-sm text-red-600">Could not load appointments. Please refresh the page.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 pb-2">
          <Group
            title="Upcoming"
            items={upcoming}
            total={upcomingTotal}
            seeAllHref={listFor("upcoming")}
            empty="Nothing booked."
            zone={zone}
            back={back}
            nextId={nextId}
          />
          <Group
            title="Past"
            items={past}
            total={pastTotal}
            seeAllHref={listFor("past")}
            empty="No past appointments."
            zone={zone}
            back={back}
          />
        </div>
      )}
    </section>
  );
}
