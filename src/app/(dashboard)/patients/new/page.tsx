import { redirect } from "next/navigation";
import { PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { PatientForm } from "@/components/patients/patient-form";
import { createPatientAction } from "@/actions/create-patient";
import { loadMyAccess } from "@/lib/access-page";

/**
 * Server Component: New Patient
 *
 * For users with can_create on "Patients". The form posts to
 * POST /api/patients through createPatientAction; the patient joins the
 * caller's own clinic.
 */
export default async function NewPatientPage() {
  const access = await loadMyAccess();
  if (!access?.grid.Patients.can_create) redirect(PATHS.patients.list());

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.patients.list()}>Back to patients</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          New patient
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Only the name is required. You can add their medical history and documents next.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <PatientForm mode="create" action={createPatientAction} cancelHref={PATHS.patients.list()} />
      </div>
    </div>
  );
}
