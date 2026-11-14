import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { patientName } from "@/lib/patient-format";
import { isValidUuid } from "@/services/api-guard";
import { BackLink } from "@/components/ui/back-link";
import { InvoiceForm } from "@/components/finances/invoice-form";
import { createInvoiceAction } from "@/actions/create-invoice";
import type { PatientModel } from "@/types/patients";

/**
 * Server Component: New Treatment
 *
 * For users with can_create on "Finances". ?patient= and ?appointment= prefill
 * the form (from a patient's page or an appointment); ?back= must be a page
 * of this app. Saving opens the new treatment's page.
 */
export default async function NewTreatmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; appointment?: string; back?: string }>;
}) {
  const params = await searchParams;
  const access = await loadMyAccess();
  const patientId = params.patient && isValidUuid(params.patient) ? params.patient : undefined;
  // Without Reports there is no clinic-wide list to return to
  const fallback = access?.grid.Reports.can_view
    ? PATHS.finances.list()
    : patientId
      ? PATHS.patients.detail(patientId)
      : PATHS.patients.list();
  const back = params.back?.startsWith("/") && !params.back.startsWith("//") && !params.back.includes("\\") ? params.back : fallback;
  if (!access?.grid.Finances.can_create) redirect(fallback);

  const patientRes = patientId ? await serverApiFetch(API_PATHS.patients.detail(patientId)) : null;
  const patient: PatientModel | null = patientRes?.ok ? (await patientRes.json()).patient : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={back}>Back</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">New treatment</h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Record the full cost. The patient can pay it all now, in parts over time, or later.
        </p>
      </div>
      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <InvoiceForm
          action={createInvoiceAction}
          patient={patient ? { id: patient.id, name: patientName(patient) } : null}
          appointmentId={params.appointment && isValidUuid(params.appointment) ? params.appointment : undefined}
          currency={access.clinic?.currency}
          cancelHref={back}
        />
      </div>
    </div>
  );
}
