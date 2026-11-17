import type { Metadata } from "next";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { redirectIfAuthenticated } from "@/services/page-guard";

export const metadata: Metadata = {
  title: "Sign in | BienSync Clinic OS",
  description: "Secure doctor and staff portal for BienSync clinic management.",
};

/**
 * Server Component: Sign in
 *
 * The sign-in form in the shared AuthShell. ?reset=done (after choosing a
 * new password from a reset link) shows a notice above the form.
 */
export default async function BienSyncLogin({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  await redirectIfAuthenticated();
  const { reset } = await searchParams;

  return (
    <AuthShell heading="Sign in to BienSync" title="Welcome back" subtitle="Sign in to manage your clinic, patients and appointments.">
      {reset === "done" && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <HiOutlineCheckCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Your password was changed. Sign in with the new one.
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
