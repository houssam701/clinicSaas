"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

export type DeleteUserResult = { error?: string };

/**
 * Server Action: deleteUserAction
 *
 * Calls DELETE /api/users/[id] (platform users list and an Admin's team).
 * On success both lists are revalidated, so the row disappears without a page reload.
 */
export async function deleteUserAction(userId: string): Promise<DeleteUserResult> {
  const response = await sendApiJson(API_PATHS.users.detail(userId), "DELETE");
  if (!response) return { error: "Network error — please try again." };

  if (response.status === 204 || response.status === 404) {
    // 404: already gone, which is the outcome the user wanted
    revalidatePath(PATHS.platform.users.list());
    revalidatePath(PATHS.team.list());
    return {};
  }

  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error ?? "Could not delete this user. Please try again." };
}
