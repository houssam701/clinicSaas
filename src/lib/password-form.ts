/**
 * Helpers for the "Change password" form on the Account page. Kept out of
 * the "use server" action file (every export there becomes an endpoint).
 */

export type PasswordFormField = "current_password" | "new_password" | "confirm_password";

export type PasswordFormState = {
  /** True once the password was changed (the form clears and says so) */
  saved?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<PasswordFormField, string[]>>;
};

export function readPasswordForm(formData: FormData): Record<PasswordFormField, string> {
  const value = (name: PasswordFormField) => (formData.get(name) as string | null) ?? "";
  return {
    current_password: value("current_password"),
    new_password: value("new_password"),
    confirm_password: value("confirm_password"),
  };
}

/** Maps a failed POST /api/auth/password response (or null) to form errors. */
export async function toPasswordFormState(response: Response | null): Promise<PasswordFormState> {
  if (!response) return { error: "Network error — please try again." };

  const data: { error?: string; details?: { fieldErrors?: PasswordFormState["fieldErrors"] } } =
    await response.json().catch(() => ({}));

  switch (response.status) {
    case 400:
    case 422:
      return {
        error: data.details?.fieldErrors ? undefined : data.error,
        fieldErrors: data.details?.fieldErrors,
      };
    case 401:
      return { error: "Your session has expired. Please sign in again." };
    case 429:
      return { error: data.error ?? "Too many wrong passwords. Please wait and try again." };
    default:
      return { error: data.error ?? "Something went wrong. Please try again." };
  }
}
