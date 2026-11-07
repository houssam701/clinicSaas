import { notFound, redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { PatientForm } from "@/components/patients/patient-form";
import { updatePatientAction } from "@/actions/update-patient";
import { loadMyAccess } from "@/lib/access-page";
import { patientName } from "@/lib/patient-format";
import type { PatientModel } from "@/types/patients";

/**
 * Server Component: Edit Patient
 *
 * For users with can_edit on "Patients". Loads the patient
 * (GET /api/patients/[id], own clinic only) and submits to
 * PATCH /api/patients/[id] through updatePatientAction.
 */
export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [access, res] = await Promise.all([loadMyAccess(), serverApiFetch(API_PATHS.patients.detail(id))]);
  if (!access?.grid.Patients.can_edit) redirect(PATHS.patients.detail(id));
  if (!res.ok) notFound();
  const { patient }: { patient: PatientModel } = await res.json();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.patients.detail(id)}>Back to patient</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Edit {patientName(patient)}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Update their details. Clearing an optional field removes it.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <PatientForm
          mode="edit"
          action={updatePatientAction.bind(null, id)}
          cancelHref={PATHS.patients.detail(id)}
          initialValues={{
            first_name: patient.first_name,
            last_name: patient.last_name,
            email: patient.email ?? "",
            phone: patient.phone ?? "",
            date_of_birth: patient.date_of_birth?.slice(0, 10) ?? "",
            gender: patient.gender ?? "",
          }}
        />
      </div>
    </div>
  );
}
