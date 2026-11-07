import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { isIsoDate, todayIn, zonedParts } from "@/lib/time-zone";
import { patientName } from "@/lib/patient-format";
import { safeAppointmentsBack, withSavedNotice } from "@/config/appointments-view";
import { BackLink } from "@/components/ui/back-link";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { createAppointmentAction } from "@/actions/create-appointment";
import { UNASSIGNED } from "@/lib/appointment-form";
import type { AppointmentStaffMember } from "@/types/appointments";
import type { PatientModel } from "@/types/patients";

/** The next half hour in `zone`, e.g. 09:12 → "09:30". */
function nextHalfHour(zone: string): string {
  const p = zonedParts(new Date(), zone);
  const minutes = Math.min(Math.ceil((p.hour * 60 + p.minute + 1) / 30) * 30, 23 * 60 + 30);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Server Component: New Appointment
 *
 * For users with can_create on "Appointments". ?date=, ?time=, ?staff= and
 * ?patient= prefill the form (from a calendar slot or a patient's page);
 * ?back= is where it returns after booking.
 */
export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; staff?: string; patient?: string; back?: string }>;
}) {
  const params = await searchParams;
  const back = safeAppointmentsBack(params.back, PATHS.appointments.list());

  const access = await loadMyAccess();
  if (!access?.grid.Appointments.can_create) redirect(back);
  const zone = access.clinic?.timezone ?? "UTC";

  const [staffRes, patientRes] = await Promise.all([
    serverApiFetch(API_PATHS.appointments.staff),
    params.patient ? serverApiFetch(API_PATHS.patients.detail(params.patient)) : null,
  ]);
  const { staff = [] }: { staff?: AppointmentStaffMember[] } = staffRes.ok ? await staffRes.json() : {};
  const patient: PatientModel | null = patientRes?.ok ? (await patientRes.json()).patient : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={back}>Back to appointments</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          New appointment
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Times are in {zone.replace(/_/g, " ")}.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <AppointmentForm
          mode="create"
          action={createAppointmentAction.bind(null, withSavedNotice(back))}
          zone={zone}
          staff={staff}
          cancelHref={back}
          initialValues={{
            patient: patient ? { id: patient.id, name: patientName(patient) } : null,
            // A slot's admin; the Unassigned column; else the signed-in admin.
            // Staff hold no appointments, so they start with nothing chosen.
            user_id: staff.some((m) => m.id === params.staff)
              ? params.staff!
              : params.staff === "none"
                ? UNASSIGNED
                : staff.some((m) => m.id === access.me.id)
                  ? access.me.id
                  : "",
            date: isIsoDate(params.date) ? params.date : todayIn(zone),
            time: params.time && /^\d{2}:\d{2}$/.test(params.time) ? params.time : nextHalfHour(zone),
            duration_minutes: "30",
            reason_for_visit: "",
          }}
        />
      </div>
    </div>
  );
}
