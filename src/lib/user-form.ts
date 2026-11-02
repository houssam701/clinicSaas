/**
 * Shared helpers for the platform user form (create and edit).
 *
 * Kept out of the "use server" action files on purpose: every export of a
 * "use server" module becomes a server action the browser can call, so plain
 * helpers belong here.
 */

type UserFormField = "email" | "password" | "first_name" | "last_name" | "role" | "clinic_id";

export type UserFormState = {
  error?: string;
  fieldErrors?: Partial<Record<UserFormField, string[]>>;
};

/** Reads the shared user form. An empty password means "unchanged" on edit. */
export function readUserForm(formData: FormData) {
  const text = (name: UserFormField) => ((formData.get(name) as string | null) ?? "").trim();
  return {
    first_name: text("first_name"),
    last_name:  text("last_name"),
    email:      text("email"),
    password:   (formData.get("password") as string | null) ?? "",
    role:       text("role"),
    clinic_id:  text("clinic_id"),
  };
}

/** Maps a failed /api/users response (or null for a network error) to form errors. */
export async function toUserFormState(response: Response | null): Promise<UserFormState> {
  if (!response) return { error: "Network error — please try again." };

  const data: { error?: string; details?: { fieldErrors?: UserFormState["fieldErrors"] } } =
    await response.json().catch(() => ({}));

  switch (response.status) {
    case 400:
      return {
        error: data.details?.fieldErrors ? "Please fix the highlighted fields." : data.error,
        fieldErrors: data.details?.fieldErrors,
      };
    case 409:
      // A duplicate email, or a second SuperAdmin (sent as a role field error)
      return data.details?.fieldErrors
        ? { fieldErrors: data.details.fieldErrors }
        : { fieldErrors: { email: [data.error ?? "Email already in use."] } };
    case 401:
      return { error: "Your session has expired. Please sign in again." };
    case 403:
      // e.g. "Forbidden: You do not have permission to create admins"
      return { error: data.error?.replace(/^Forbidden:s*/, "") ?? "You are not allowed to do this." };
    case 404:
      return { error: "This user no longer exists." };
    default:
      return { error: data.error ?? "Something went wrong. Please try again." };
  }
}
