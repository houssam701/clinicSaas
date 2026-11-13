"use server";

import { signOut } from "@/lib/auth";
import { LOGIN_PATH } from "@/config/role-routes";

/**
 * Server Action: logoutAction
 *
 * Clears the NextAuth session cookie and sends the user to the login page.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: LOGIN_PATH });
}
