import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthenticated } from "@/services/page-guard";

export const metadata: Metadata = { title: "Forgot password | BienSync" };

/**
 * Server Component: Forgot password
 *
 * Signed-out page: enter an email to receive a reset link. Signed-in users
 * go home (they change their password on the Account page).
 */
export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();
  return (
    <AuthShell heading="Reset your BienSync password" title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
