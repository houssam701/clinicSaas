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
 * Enforces clinic boundary for Admin callers.
 * SuperAdmin has access to all clinics; Admin is strictly scoped to their own clinic.
 */
export function canAccessClinic(
  callerRole: UserRole,
  callerClinicId: string | null | undefined,
  patientClinicId: string,
  customErrorMessage?: string
): NextResponse | null {
  if (callerRole === UserRole.Admin) {
    if (!callerClinicId || callerClinicId !== patientClinicId) {
      return NextResponse.json(
        { error: customErrorMessage ?? "Forbidden: Patient belongs to a different clinic" },
        { status: 403 }
      );
    }
  }
  return null;
}
