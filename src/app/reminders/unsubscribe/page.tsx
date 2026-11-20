import type { Metadata } from "next";
import { HiOutlineBellSlash, HiOutlineCheckCircle } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import { Logo } from "@/components/shared/Logo";
import { unsubscribeRemindersAction } from "@/actions/unsubscribe-reminders";

export const metadata: Metadata = {
  title: "Appointment reminders",
  // The link is personal: keep it out of search engines and referrers
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

const card = "rounded-md border border-slate-200 bg-white p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

/**
 * Server Component: Stop appointment reminders
 *
 * Opened from the link in a reminder email (?p=&s=, signed). Asks first, and
 * changes nothing until the patient confirms: email scanners open links on
 * their own. ?done=1 after confirming. No sign-in; patients have no account.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; s?: string; done?: string; failed?: string }>;
}) {
  const { p = "", s = "", done, failed } = await searchParams;
  const res = p && s ? await serverApiFetch(API_PATHS.reminders.unsubscribe({ p, s })) : null;
  const target: { clinic: string; subscribed: boolean } | null = res?.ok ? await res.json() : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bgColor px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {!target ? (
          <div className={card}>
            <p className="font-bold text-slate-800">This link is not valid</p>
            <p className="mt-2 text-sm text-slate-600">Open the link from the reminder email again, or contact your clinic.</p>
          </div>
        ) : done || !target.subscribed ? (
          <div role="status" className={card}>
            <HiOutlineCheckCircle aria-hidden="true" className="mx-auto h-9 w-9 text-emerald-600" />
            <p className="mt-3 font-bold text-slate-800">You won&apos;t get reminder emails anymore</p>
            <p className="mt-2 text-sm text-slate-600">
              {target.clinic} will no longer email you before your appointments. To get them again, ask the clinic.
            </p>
          </div>
        ) : (
          <div className={card}>
            <HiOutlineBellSlash aria-hidden="true" className="mx-auto h-9 w-9 text-primary" />
            <p className="mt-3 font-bold text-slate-800">Stop appointment reminders?</p>
            <p className="mt-2 text-sm text-slate-600">
              {target.clinic} emails you before your appointments. You can stop these reminder emails. Your appointments stay as they are.
            </p>
            {failed && <p className="mt-4 text-sm font-medium text-red-600">Something went wrong. Please try again.</p>}
            <form action={unsubscribeRemindersAction.bind(null, p, s)} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                Stop reminder emails
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
