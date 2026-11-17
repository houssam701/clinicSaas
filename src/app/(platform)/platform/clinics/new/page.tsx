import { PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { ClinicForm } from "@/components/platform/clinic-form";
import { createClinicAction } from "@/actions/create-clinic";

/**
 * Server Component: New Clinic
 *
 * The form posts to POST /api/clinics through createClinicAction.
 */
export default function NewClinicPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.platform.clinics.list()}>Back to clinics</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          New clinic
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Add a clinic to BienSync. You can add its admins and staff afterwards.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <ClinicForm mode="create" action={createClinicAction} />
      </div>
    </div>
  );
}
