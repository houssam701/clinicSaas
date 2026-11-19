import { HiOutlineCheckCircle } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { ClinicSettingsForm } from "@/components/settings/clinic-settings-form";
import { updateClinicSettingsAction } from "@/actions/update-clinic-settings";
import type { ClinicModel } from "@/types/clinics";
import { UserRole } from "@/types/users";
import { currencyOptions, timeZoneOptions } from "@/lib/clinic-options";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

/**
 * Server Component: Clinic settings
 *
 * The clinic's name, time zone and currency, from GET /api/clinic. Admins
 * with Edit on "Settings" can change them; View alone shows them read-only.
 * The clinic type is shown but set by the platform. ?saved=1 after saving.
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [{ saved }, access] = await Promise.all([searchParams, loadMyAccess()]);
  const can = access?.grid.Settings;

  // Admins only (like the API), even if a Settings row exists for someone else
  if (!can?.can_view || !access?.clinic || access.me.role !== UserRole.Admin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Settings</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to the clinic settings.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin if something needs to change.</p>
        </div>
      </div>
    );
  }

  const res = await serverApiFetch(API_PATHS.myClinic);
  const clinic: ClinicModel | null = res.ok ? (await res.json()).clinic : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Your clinic&apos;s name, time zone, currency and appointment reminders.</p>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <HiOutlineCheckCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          Settings saved.
        </p>
      )}

      {!clinic ? (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          Couldn&apos;t load the clinic. Refresh the page to try again.
        </p>
      ) : (
        <>
          <section className={`${card} p-6 sm:p-8`}>
            {!can.can_edit && (
              <p className="mb-6 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                You can see these settings but not change them.
              </p>
            )}
            <ClinicSettingsForm
              action={updateClinicSettingsAction}
              readOnly={!can.can_edit}
              initial={{
                name: clinic.name,
                timezone: clinic.timezone,
                currency: clinic.currency,
                reminders_enabled: clinic.reminders_enabled,
                reminder_days_before: clinic.reminder_days_before,
              }}
              timeZones={timeZoneOptions(clinic.timezone)}
              currencies={currencyOptions(clinic.currency)}
            />
          </section>

          <section className={`${card} flex flex-wrap items-baseline justify-between gap-2 px-6 py-4 sm:px-8`}>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Clinic type</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {clinic.clinic_type}
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Set by the platform; it decides which clinical fields exist.</span>
            </span>
          </section>
        </>
      )}
    </div>
  );
}
