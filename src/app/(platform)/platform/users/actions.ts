"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverApiFetch } from "@/lib/server-api";

export type CreateUserFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"email" | "password" | "first_name" | "last_name" | "role" | "clinic_id", string[]>
  >;
};

/**
 * Server Action: createUserAction
 *
 * Called by CreateUserForm via useActionState.
 * Posts the form to POST /api/users (SuperAdmin only) and either redirects
 * back to the users list or returns the API's validation errors.
 */
export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  const body = {
    first_name: ((formData.get("first_name") as string) ?? "").trim(),
    last_name:  ((formData.get("last_name") as string) ?? "").trim(),
    email:      ((formData.get("email") as string) ?? "").trim(),
    password:   (formData.get("password") as string) ?? "",
    role:       formData.get("role") as string,
    clinic_id:  (formData.get("clinic_id") as string) || undefined,
  };

  let response: Response;
  try {
    response = await serverApiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "Network error — please try again." };
  }

  if (response.status === 201) {
    revalidatePath("/platform/users");
    redirect("/platform/users?created=1");
  }

  const data: { error?: string; details?: { fieldErrors?: CreateUserFormState["fieldErrors"] } } =
    await response.json().catch(() => ({}));

  if (response.status === 400) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: data.details?.fieldErrors,
    };
  }
  if (response.status === 409) {
    // 409 is either a duplicate email or a second SuperAdmin (sent as a role field error)
    return data.details?.fieldErrors
      ? { fieldErrors: data.details.fieldErrors }
      : { fieldErrors: { email: [data.error ?? "Email already in use"] } };
  }
  if (response.status === 401 || response.status === 403) {
    return { error: "Your session does not allow creating users. Please sign in again." };
  }
  return { error: data.error ?? "Something went wrong. Please try again." };
}
