"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import {
  readUserForm,
  toUserFormState,
  type UserFormState,
} from "@/lib/user-form";

/**
 * Server Action: createUserAction
 *
 * Posts the user form to POST /api/users (SuperAdmin only), then redirects
 * back to the users list or returns the API's validation errors.
 */
export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const { clinic_id, ...rest } = readUserForm(formData);
  const response = await sendApiJson(API_PATHS.users.list(), "POST", {
    ...rest,
    clinic_id: clinic_id || undefined,
  });

  if (response?.status === 201) {
    revalidatePath(PATHS.platform.users.list());
    redirect(PATHS.platform.users.list({ created: 1 }));
  }
  return toUserFormState(response);
}
