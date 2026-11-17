import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { resetPasswordAction } from "@/actions/reset-password";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { RESET_LINK_MINUTES } from "@/config/auth-limits";

export const metadata: Metadata = {
  title: "Choose a new password | BienSync",
  // The token is in the URL: never send it to another site as a referrer
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/**
 * Server Component: Reset password
 *
 * Opened from the emailed link (?token=). Checks the link first; a used or
 * expired one offers a new link instead of the form.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const res = token ? await serverApiFetch(API_PATHS.auth.passwordReset({ token })) : null;
  const valid = res?.ok ? ((await res.json()) as { valid: boolean }).valid : false;

  return (
    <AuthShell heading="Choose a new BienSync password" title="Choose a new password" subtitle="Pick one you don't use on other sites.">
      {valid ? (
        <ResetPasswordForm action={resetPasswordAction.bind(null, token)} />
      ) : (
        <div role="alert" className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-bold text-amber-900">This link no longer works</p>
          <p className="text-sm text-amber-800">Reset links work once and for {RESET_LINK_MINUTES} minutes. Ask for a new one.</p>
          <Link href={PATHS.forgotPassword} className="inline-block text-sm font-bold text-primary hover:text-blue-700">
            Ask for a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
