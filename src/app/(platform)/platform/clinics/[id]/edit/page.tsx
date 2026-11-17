import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { ClinicForm } from "@/components/platform/clinic-form";
import { updateClinicAction } from "@/actions/update-clinic";
import type { ClinicModel, ClinicType } from "@/types/clinics";

/**
 * Server Component: Edit Clinic
 *
 * Loads the clinic (GET /api/clinics/[id]). The form submits to
 * PATCH /api/clinics/[id] via updateClinicAction.
 */
export default async function EditClinicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clinicRes = await serverApiFetch(API_PATHS.clinics.detail(id));
  if (!clinicRes.ok) notFound();
  const { clinic }: { clinic: ClinicModel } = await clinicRes.json();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.platform.clinics.list()}>Back to clinics</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Edit {clinic.name}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Update the clinic&apos;s name or type.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <ClinicForm
          mode="edit"
          action={updateClinicAction.bind(null, clinic.id)}
          initialValues={{ name: clinic.name, clinic_type: clinic.clinic_type as ClinicType }}
        />
      </div>
    </div>
  );
}
