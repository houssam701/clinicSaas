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
 * Server Action: updateUserAction
 *
 * Bound to a user id by the edit page. Sends the form to PATCH /api/users/[id];
 * the password is only sent when a new one was typed.
 */
export async function updateUserAction(
  userId: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const { password, clinic_id, ...rest } = readUserForm(formData);
  const response = await sendApiJson(API_PATHS.users.detail(userId), "PATCH", {
    ...rest,
    clinic_id: clinic_id || null,
    ...(password ? { password } : {}),
  });

  if (response?.ok) {
    revalidatePath(PATHS.platform.users.list());
    redirect(PATHS.platform.users.list({ updated: 1 }));
  }
  return toUserFormState(response);
}
