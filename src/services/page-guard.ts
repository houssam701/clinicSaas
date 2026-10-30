import { redirect } from "next/navigation";
import { auth } from "../lib/auth";
import { LOGIN_PATH } from "../config/role-routes";
import { getHomePathForRole } from "./role-routing";
import type { UserRole } from "../types/users";

/**
 * Server-side guard for layouts and pages.
 * Unauthenticated callers go to the login page; authenticated callers whose
 * role is not allowed are sent to their own role's home instead of a 403.
 */
export async function requirePageRole(allowedRoles: UserRole[]) {
  const session = await auth();
  if (!session?.user) redirect(LOGIN_PATH);

  if (!allowedRoles.includes(session.user.role)) {
    redirect(getHomePathForRole(session.user.role));
  }
  return session;
}

/** For guest-only pages (login): signed-in users are sent to their role's home. */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await auth();
  if (session?.user) redirect(getHomePathForRole(session.user.role));
}

/** Sends the current visitor to their role's home, or to login if signed out. */
export async function redirectToRoleHome(): Promise<never> {
  const session = await auth();
  if (!session?.user) redirect(LOGIN_PATH);
  redirect(getHomePathForRole(session.user.role));
}
