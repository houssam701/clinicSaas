"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import {
  readPermissionsForm,
  toPermissionsFormState,
  type PermissionsFormState,
} from "@/lib/permission-form";

/**
 * Server Action: updateUserPermissionsAction
 *
 * Bound to a user id by the access pages (platform and clinic). Replaces all
 * of the user's module permissions at once via PUT /api/users/[id]/permissions
 * (which also trims everyone they created), then stays on the page with a
 * success message.
 */
export async function updateUserPermissionsAction(
  userId: string,
  _prevState: PermissionsFormState,
  formData: FormData
): Promise<PermissionsFormState> {
  const response = await sendApiJson(
    API_PATHS.users.permissions(userId),
    "PUT",
    { permissions: readPermissionsForm(formData) }
  );

  if (response?.ok) {
    revalidatePath(PATHS.platform.users.access(userId));
    revalidatePath(PATHS.team.access(userId));
    return { success: "Access saved. It applies from their next request." };
  }
  return toPermissionsFormState(response);
}
