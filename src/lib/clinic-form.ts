/**
 * Shared helpers for the platform clinic form (create and edit).
 *
 * Kept out of the "use server" action files on purpose: every export of a
 * "use server" module becomes a server action the browser can call, so plain
 * helpers belong here.
 */

type ClinicFormField = "name" | "clinic_type" | "timezone";

export type ClinicFormState = {
  error?: string;
  fieldErrors?: Partial<Record<ClinicFormField, string[]>>;
};

/** Reads the shared clinic form. */
export function readClinicForm(formData: FormData) {
  const text = (name: ClinicFormField) => ((formData.get(name) as string | null) ?? "").trim();
  return {
    name:        text("name"),
    clinic_type: text("clinic_type"),
    timezone:    text("timezone"),
  };
}

/** Maps a failed /api/clinics response (or null for a network error) to form errors. */
export async function toClinicFormState(response: Response | null): Promise<ClinicFormState> {
  if (!response) return { error: "Network error — please try again." };

  const data: { error?: string; details?: { fieldErrors?: ClinicFormState["fieldErrors"] } } =
    await response.json().catch(() => ({}));

  switch (response.status) {
    case 400:
      return {
        error: data.details?.fieldErrors ? "Please fix the highlighted fields." : data.error,
        fieldErrors: data.details?.fieldErrors,
      };
    case 409:
      return { fieldErrors: data.details?.fieldErrors ?? { name: [data.error ?? "Name already in use."] } };
    case 401:
    case 403:
      return { error: "Your session does not allow this action. Please sign in again." };
    case 404:
      return { error: "This clinic no longer exists." };
    default:
      return { error: data.error ?? "Something went wrong. Please try again." };
  }
}
