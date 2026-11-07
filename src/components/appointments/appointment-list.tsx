import Link from "next/link";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import { PATHS } from "@/config/path";
import { formatDay, formatTime, todayIn, zonedParts } from "@/lib/time-zone";
import { patientName } from "@/lib/patient-format";
import { deleteAppointmentAction } from "@/actions/delete-appointment";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusButtons } from "@/components/appointments/status-buttons";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, type AppointmentWithPeople } from "@/types/appointments";
import { cn } from "@/lib/utils";

const rowButton =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

export interface AppointmentListProps {
  appointments: AppointmentWithPeople[];
  zone: string;
  can: { can_edit: boolean; can_delete: boolean };
  /** Patient names link to their page when the user can view patients */
  canViewPatients: boolean;
  back: string;
}

/**
 * Agenda list: appointments grouped by day (clinic zone), each with its time,
 * patient, staff member, reason and status, plus quick actions.
 */
export function AppointmentList({ appointments, zone, can, canViewPatients, back }: AppointmentListProps) {
  const today = todayIn(zone);
  const groups = new Map<string, AppointmentWithPeople[]>();
  for (const appt of appointments) {
    const date = zonedParts(new Date(appt.scheduled_time), zone).date;
    groups.set(date, [...(groups.get(date) ?? []), appt]);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([date, items]) => (
        <section key={date} className="overflow-hidden rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
          <h2
            className={cn(
              "flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 text-sm font-bold",
              date === today ? "bg-primary/5 text-primary" : "text-slate-700 dark:text-slate-200"
            )}
          >
            <span>
              {formatDay(date, "long")}
              {date === today && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">Today</span>}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {items.length} {items.length === 1 ? "appointment" : "appointments"}
            </span>
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((appt) => {
              const status = appt.status as AppointmentStatus;
              const patient = appt.patient ? patientName(appt.patient) : "Unknown patient";
              const end = new Date(new Date(appt.scheduled_time).getTime() + appt.duration_minutes * 60000);
              return (
                <li key={appt.id} className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="w-24 shrink-0 tabular-nums">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{formatTime(appt.scheduled_time, zone)}</p>
                      <p className="text-xs text-slate-500">
                        to {formatTime(end, zone)} · {appt.duration_minutes} min
                      </p>
                    </div>
                    <div className="min-w-0">
                      {canViewPatients && appt.patient ? (
                        <Link
                          href={PATHS.patients.detail(appt.patient.id)}
                          prefetch={false}
                          className="font-semibold text-slate-800 dark:text-white hover:text-primary"
                        >
                          {patient}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-800 dark:text-white">{patient}</span>
                      )}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className={cn("rounded-md px-2 py-0.5 font-bold", STATUS_STYLE[status].badge)}>
                          {APPOINTMENT_STATUS_LABELS[status]}
                        </span>
                        <span>{appt.staff ? patientName(appt.staff) : "Unassigned"}</span>
                        {appt.reason_for_visit && <span className="truncate">· {appt.reason_for_visit}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {can.can_edit && status === AppointmentStatus.Scheduled && (
                      <StatusButtons appointmentId={appt.id} patient={patient} />
                    )}
                    <Link
                      href={PATHS.appointments.edit(appt.id, { back })}
                      prefetch={false}
                      className={rowButton}
                      aria-label={`${can.can_edit ? "Edit" : "Open"} appointment with ${patient}`}
                    >
                      <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
                      {can.can_edit ? "Edit" : "Open"}
                    </Link>
                    {can.can_delete && (
                      <DeleteButton
                        action={deleteAppointmentAction.bind(null, appt.id)}
                        itemName={`appointment with ${patient}`}
                        title="Delete this appointment?"
                        description={`${patient}, ${formatDay(date)} at ${formatTime(appt.scheduled_time, zone)}. To keep a record, cancel it instead. This cannot be undone.`}
                        confirmLabel="Delete appointment"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
