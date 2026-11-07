import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { formatDay, formatTime, zonedParts } from "@/lib/time-zone";
import { patientName } from "@/lib/patient-format";
import { safeAppointmentsBack, withSavedNotice } from "@/config/appointments-view";
import { BackLink } from "@/components/ui/back-link";
import { DeleteButton } from "@/components/ui/delete-button";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { StatusButtons } from "@/components/appointments/status-buttons";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { updateAppointmentAction } from "@/actions/update-appointment";
import { UNASSIGNED } from "@/lib/appointment-form";
import { deleteAppointmentAction } from "@/actions/delete-appointment";
import {
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
  type AppointmentStaffMember,
  type AppointmentWithPeople,
} from "@/types/appointments";
import { cn } from "@/lib/utils";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

/**
 * Server Component: Appointment
 *
 * Opened from the calendar or list. Shows the appointment with its status
 * actions; users with can_edit get the edit form, others a read-only summary.
 * ?back= is the calendar or list page to return to.
 */
export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const [{ id }, { back: backParam }] = await Promise.all([params, searchParams]);
  const back = safeAppointmentsBack(backParam, PATHS.appointments.list());

  const [access, apptRes, staffRes] = await Promise.all([
    loadMyAccess(),
    serverApiFetch(API_PATHS.appointments.detail(id)),
    serverApiFetch(API_PATHS.appointments.staff),
  ]);
  const can = access?.grid.Appointments;
  if (!can?.can_view) redirect(PATHS.appointments.list());
  if (!apptRes.ok) notFound();

  const { appointment }: { appointment: AppointmentWithPeople } = await apptRes.json();
  const { staff: admins = [] }: { staff?: AppointmentStaffMember[] } = staffRes.ok ? await staffRes.json() : {};
  const zone = access!.clinic?.timezone ?? "UTC";
  // Keep the current holder selectable even if they are not an admin (older bookings),
  // so saving the form never unassigns them by accident
  const staff =
    appointment.staff && !admins.some((m) => m.id === appointment.staff!.id)
      ? [...admins, { ...appointment.staff, role: "" }]
      : admins;
  const status = appointment.status as AppointmentStatus;
  const patient = appointment.patient ? patientName(appointment.patient) : "Unknown patient";
  const start = zonedParts(new Date(appointment.scheduled_time), zone);
  const end = new Date(new Date(appointment.scheduled_time).getTime() + appointment.duration_minutes * 60000);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={back}>Back to appointments</BackLink>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{patient}</h1>
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", STATUS_STYLE[status].badge)}>
            {APPOINTMENT_STATUS_LABELS[status]}
          </span>
        </div>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          {formatDay(start.date, "long")}, {formatTime(appointment.scheduled_time, zone)}–{formatTime(end, zone)} ·{" "}
          {appointment.staff ? patientName(appointment.staff) : "Unassigned"}
        </p>
      </div>

      {/* Status + delete */}
      {(can.can_edit && status === AppointmentStatus.Scheduled) || can.can_delete || (access!.grid.Patients.can_view && appointment.patient) ? (
        <div className="flex flex-wrap items-center gap-2">
          {can.can_edit && status === AppointmentStatus.Scheduled && (
            <StatusButtons appointmentId={appointment.id} patient={patient} size="md" />
          )}
          {access!.grid.Patients.can_view && appointment.patient && (
            <Link
              href={PATHS.patients.detail(appointment.patient.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              Patient file
            </Link>
          )}
          {can.can_delete && (
            <DeleteButton
              size="md"
              action={deleteAppointmentAction.bind(null, appointment.id)}
              itemName={`appointment with ${patient}`}
              title="Delete this appointment?"
              description="To keep a record, cancel it instead. This cannot be undone."
              confirmLabel="Delete appointment"
              redirectTo={back}
            />
          )}
        </div>
      ) : null}

      {can.can_edit ? (
        <div className={`${card} p-6 sm:p-8`}>
          <AppointmentForm
            mode="edit"
            action={updateAppointmentAction.bind(null, appointment.id, withSavedNotice(back))}
            zone={zone}
            staff={staff}
            cancelHref={back}
            initialValues={{
              patient: appointment.patient ? { id: appointment.patient.id, name: patient } : null,
              user_id: appointment.user_id ?? UNASSIGNED,
              date: start.date,
              time: formatTime(appointment.scheduled_time, zone),
              duration_minutes: String(appointment.duration_minutes),
              reason_for_visit: appointment.reason_for_visit ?? "",
            }}
          />
        </div>
      ) : (
        <dl className={`${card} divide-y divide-slate-200 dark:divide-slate-800`}>
          {[
            ["Duration", `${appointment.duration_minutes} min`],
            ["With", appointment.staff ? patientName(appointment.staff) : "Unassigned"],
            ["Reason for visit", appointment.reason_for_visit || "Not given"],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
