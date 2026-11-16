"use server";

import { redirect } from "next/navigation";
import { sendApiJson, serverApiFetch } from "@/lib/server-api";
import { forwardSetCookies } from "@/lib/forward-cookies";
import { API_PATHS, PATHS } from "@/config/path";
import { readPasswordForm, toPasswordFormState, type PasswordFormState } from "@/lib/password-form";
import type { PublicUser } from "@/types/users";

/** Which Account page the form is on (the SuperAdmin's is under /platform). */
export type AccountArea = "clinic" | "platform";

/**
 * Server Action: changePasswordAction
 *
 * Changes the signed-in user's password through POST /api/auth/password.
 * The new password signs out every session of this user, so this one signs
 * in again with it right away and returns to the Account page with a notice:
 * the user stays signed in here, only their other devices are signed out.
 * (A redirect, not a plain return: the page must render with the new
 * session cookie.) If signing in again fails, they go to the login page.
 */
export async function changePasswordAction(
  area: AccountArea,
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const form = readPasswordForm(formData);
  if (form.new_password !== form.confirm_password) {
    return { fieldErrors: { confirm_password: ["The two new passwords don't match."] } };
  }

  // Read the email now: once the password changes, this session no longer works
  const meRes = await serverApiFetch(API_PATHS.auth.me);
  if (!meRes.ok) return { error: "Your session has expired. Please sign in again." };
  const { user }: { user: PublicUser } = await meRes.json();

  const response = await sendApiJson(API_PATHS.auth.password, "POST", {
    current_password: form.current_password,
    new_password: form.new_password,
  });
  if (!response?.ok) return toPasswordFormState(response);

  const login = await sendApiJson(API_PATHS.auth.login, "POST", { email: user.email, password: form.new_password });
  if (!login?.ok) redirect(PATHS.login);
  await forwardSetCookies(login);

  const account = area === "platform" ? PATHS.platform.account : PATHS.account;
  redirect(account({ password: "changed" }));
}
