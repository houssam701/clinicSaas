"use server";

import { sendApiJson } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import type { ForgotPasswordState } from "@/lib/password-form";

/**
 * Server Action: requestPasswordResetAction
 *
 * Asks POST /api/auth/password-reset to email a reset link. The answer is
 * the same whether or not the email has an account.
 */
export async function requestPasswordResetAction(_prev: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = ((formData.get("email") as string | null) ?? "").trim();
  const response = await sendApiJson(API_PATHS.auth.passwordReset(), "POST", { email });
  if (!response) return { error: "Network error — please try again." };
  if (response.ok) return { sent: true };

  const data: { details?: { fieldErrors?: { email?: string[] } } } = await response.json().catch(() => ({}));
  return response.status === 400
    ? { fieldErrors: { email: data.details?.fieldErrors?.email ?? ["Enter a valid email address."] } }
    : { error: "Something went wrong. Please try again." };
}
