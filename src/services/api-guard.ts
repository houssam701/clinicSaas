import { NextResponse } from "next/server";
import { auth } from "../lib/auth";
import { UserRole } from "../types/users";
import type { Session } from "next-auth";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export type AuthenticatedSession = Session & {
  user: NonNullable<Session["user"]>;
};

export type AuthResult =
  | { session: AuthenticatedSession; error: null }
  | { session: null; error: NextResponse };

/**
 * Authenticates the caller and enforces role authorization.
 * Defaults to allowing Admin and SuperAdmin (forbidding Staff).
 */
export async function authenticate(
  allowedRoles: UserRole[] = [UserRole.SuperAdmin, UserRole.Admin]
): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = session.user.role as UserRole;
  if (!allowedRoles.includes(role)) {
    const errorMsg =
      allowedRoles.length === 1 && allowedRoles[0] === UserRole.SuperAdmin
        ? "Forbidden: SuperAdmin role required"
        : "Forbidden: Admin or SuperAdmin role required";
    return {
      session: null,
      error: NextResponse.json({ error: errorMsg }, { status: 403 }),
    };
  }

  return { session: session as AuthenticatedSession, error: null };
}

/**
 * Enforces clinic boundary for Admin AND Staff callers.
 * SuperAdmin has access to all clinics; Admin/Staff are strictly scoped to their own clinic.
 */
export function canAccessClinic(
  callerRole: UserRole,
  callerClinicId: string | null | undefined,
  resourceClinicId: string,
  customErrorMessage?: string
): NextResponse | null {
  if (callerRole === UserRole.Admin || callerRole === UserRole.Staff) {
    if (!callerClinicId || callerClinicId !== resourceClinicId) {
      return NextResponse.json(
        { error: customErrorMessage ?? "Forbidden: Resource belongs to a different clinic" },
        { status: 403 }
      );
    }
  }
  return null;
}

/**
 * Checks whether a Staff user has a specific permission flag enabled
 * for a given module.
 *
 * Returns a 403 NextResponse if the permission is missing or set to false,
 * or null if access is granted.
 *
 * Should only be called when callerRole === Staff.
 * Admin and SuperAdmin bypass module-level permission checks entirely.
 *
 * @param userId     The Staff user's ID (from session)
 * @param moduleName e.g. "Appointments"
 * @param action     One of "can_view" | "can_create" | "can_edit" | "can_delete"
 */
export async function checkModulePermission(
  userId: string,
  moduleName: string,
  action: "can_view" | "can_create" | "can_edit" | "can_delete"
): Promise<NextResponse | null> {
  // Dynamic import to avoid circular dependency (repository → db → service)
  const { PermissionRepository } = await import("../repository/permission-repository");
  const perm = await PermissionRepository.findByUserAndModule(userId, moduleName);

  if (!perm || !perm[action]) {
    return NextResponse.json(
      {
        error: `Forbidden: You do not have '${action}' permission on '${moduleName}'`,
      },
      { status: 403 }
    );
  }
  return null;
}
