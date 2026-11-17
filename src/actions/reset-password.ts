"use server";

import { redirect } from "next/navigation";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toResetPasswordState, type ResetPasswordState } from "@/lib/password-form";

/**
 * Server Action: resetPasswordAction
 *
 * Sets the new password from a reset link (token bound in the page) through
 * POST /api/auth/password-reset/confirm, then goes to the login page with a
 * "password changed" notice.
 */
export async function resetPasswordAction(token: string, _prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const newPassword = (formData.get("new_password") as string | null) ?? "";
  const confirm = (formData.get("confirm_password") as string | null) ?? "";
  if (newPassword !== confirm) {
    return { fieldErrors: { confirm_password: ["The two passwords don't match."] } };
  }

  const response = await sendApiJson(API_PATHS.auth.passwordResetConfirm, "POST", { token, new_password: newPassword });
  if (!response?.ok) return toResetPasswordState(response);
  redirect(PATHS.loginWith({ reset: "done" }));
}
