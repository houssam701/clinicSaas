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
 * Server Action: createTeamMemberAction
 *
 * An Admin adds a Staff member or another Admin to their own clinic via
 * POST /api/admin/users (the clinic comes from their session), then goes
 * back to the team list or returns the API's validation errors.
 */
export async function createTeamMemberAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clinic_id, ...rest } = readUserForm(formData); // the clinic is never sent
  const response = await sendApiJson(API_PATHS.adminUsers, "POST", rest);

  if (response?.status === 201) {
    revalidatePath(PATHS.team.list());
    redirect(PATHS.team.list({ created: 1 }));
  }
  return toUserFormState(response);
}
