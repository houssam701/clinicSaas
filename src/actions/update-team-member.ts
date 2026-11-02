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
 * Server Action: updateTeamMemberAction
 *
 * Bound to a user id by the team edit page. Sends the form to
 * PATCH /api/users/[id] without the clinic (an Admin cannot move people);
 * the password is only sent when a new one was typed.
 */
export async function updateTeamMemberAction(
  userId: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, clinic_id, ...rest } = readUserForm(formData);
  const response = await sendApiJson(API_PATHS.users.detail(userId), "PATCH", {
    ...rest,
    ...(password ? { password } : {}),
  });

  if (response?.ok) {
    revalidatePath(PATHS.team.list());
    redirect(PATHS.team.list({ updated: 1 }));
  }
  return toUserFormState(response);
}
