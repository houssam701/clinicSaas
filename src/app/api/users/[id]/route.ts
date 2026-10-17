import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { auth } from "../../../../lib/auth";
import { UserRepository } from "../../../../repository/user-repository";
import { UpdateUserData, UpdateUserSchema, UserRole } from "../../../../types/users";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 *
 * Retrieves a user by ID with role-based and multi-tenant access control:
 *   - SuperAdmin: Can view any user.
 *   - Admin: Can only view users belonging to their own clinic.
 *   - Staff: Can only view their own user profile.
 *
 * Responses:
 *   200  { user: PublicUser }
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User not found
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const targetUser = await UserRepository.findById(id);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const callerRole = session.user.role;
  const callerClinicId = session.user.clinic_id;

  // Access control
  if (callerRole === UserRole.SuperAdmin) {
    return NextResponse.json({ user: targetUser }, { status: 200 });
  }

  if (callerRole === UserRole.Admin) {
    if (!callerClinicId || targetUser.clinic_id !== callerClinicId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access users from another clinic" },
        { status: 403 }
      );
    }
    return NextResponse.json({ user: targetUser }, { status: 200 });
  }

  if (callerRole === UserRole.Staff) {
    if (targetUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Staff can only view their own profile" },
        { status: 403 }
      );
    }
    return NextResponse.json({ user: targetUser }, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * PATCH /api/users/[id]
 *
 * Updates an existing user's information:
 *   - SuperAdmin: Can update any field on any user.
 *   - Admin: Can update Staff in their clinic or their own info; cannot change clinic_id or escalate roles.
 *   - Staff: Can only update their own first_name, last_name, or password.
 *
 * Responses:
 *   200  { message: "User updated successfully", user: PublicUser }
 *   400  Validation error
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User not found
 *   409  Email already in use
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const targetUser = await UserRepository.findById(id);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const callerRole = session.user.role;
  const callerClinicId = session.user.clinic_id;

  // Authorization and permission boundary checks
  if (callerRole === UserRole.SuperAdmin) {
    // SuperAdmin can update any user and fields
  } else if (callerRole === UserRole.Admin) {
    const isSelf = targetUser.id === session.user.id;
    const isStaffInClinic =
      targetUser.clinic_id === callerClinicId && targetUser.role === UserRole.Staff;

    if (!isSelf && !isStaffInClinic) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only manage staff within their own clinic" },
        { status: 403 }
      );
    }

    // Admins cannot change clinic_id
    if (parsed.data.clinic_id !== undefined && parsed.data.clinic_id !== callerClinicId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot reassign user to another clinic" },
        { status: 403 }
      );
    }

    // Admins cannot elevate roles
    if (parsed.data.role && parsed.data.role !== UserRole.Staff) {
      return NextResponse.json(
        { error: "Forbidden: Admins cannot assign Admin or SuperAdmin roles" },
        { status: 403 }
      );
    }
  } else if (callerRole === UserRole.Staff) {
    // Staff can only update their own profile
    if (targetUser.id !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Staff can only update their own profile" },
        { status: 403 }
      );
    }

    // Staff cannot update role, clinic_id, or email
    if (
      parsed.data.role !== undefined ||
      parsed.data.clinic_id !== undefined ||
      parsed.data.email !== undefined
    ) {
      return NextResponse.json(
        { error: "Forbidden: Staff may only update first_name, last_name, or password" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check email uniqueness if changing email
  if (parsed.data.email && parsed.data.email !== targetUser.email) {
    const emailTaken = await UserRepository.emailExistsExcept(parsed.data.email, id);
    if (emailTaken) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  // Prepare payload
  const updatePayload: UpdateUserData = {};

  if (parsed.data.first_name !== undefined) updatePayload.first_name = parsed.data.first_name;
  if (parsed.data.last_name !== undefined) updatePayload.last_name = parsed.data.last_name;
  if (parsed.data.email !== undefined) updatePayload.email = parsed.data.email;
  if (parsed.data.role !== undefined) updatePayload.role = parsed.data.role;
  if (parsed.data.clinic_id !== undefined) updatePayload.clinic_id = parsed.data.clinic_id;

  if (parsed.data.password) {
    updatePayload.password_hash = await argon2.hash(parsed.data.password, {
      type:        argon2.argon2id,
      memoryCost:  65536, // 64 MB
      timeCost:    3,
      parallelism: 4,
    });
  }

  const updatedUser = await UserRepository.updateUser(id, updatePayload);
  return NextResponse.json(
    { message: "User updated successfully", user: updatedUser },
    { status: 200 }
  );
}

/**
 * DELETE /api/users/[id]
 *
 * Deletes a user by ID:
 *   - SuperAdmin: Can delete any user (except themselves, and cannot delete the last SuperAdmin).
 *   - Admin: Can only delete Staff members in their own clinic.
 *   - Staff: Forbidden (403).
 *
 * Responses:
 *   200  { message: "User deleted successfully", id }
 *   400  Bad request (self-deletion or deleting last SuperAdmin)
 *   401  Unauthorized
 *   403  Forbidden
 *   404  User not found
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Bad Request: You cannot delete your own account" },
      { status: 400 }
    );
  }

  const targetUser = await UserRepository.findById(id);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const callerRole = session.user.role;
  const callerClinicId = session.user.clinic_id;

  if (callerRole === UserRole.SuperAdmin) {
    // If target is SuperAdmin, ensure at least one other SuperAdmin remains
    if (targetUser.role === UserRole.SuperAdmin) {
      const superAdmins = await UserRepository.findAll({ role: UserRole.SuperAdmin });
      if (superAdmins.length <= 1) {
        return NextResponse.json(
          { error: "Bad Request: Cannot delete the last SuperAdmin in the system" },
          { status: 400 }
        );
      }
    }
  } else if (callerRole === UserRole.Admin) {
    // Admins can ONLY delete Staff belonging to their own clinic
    if (!callerClinicId || targetUser.clinic_id !== callerClinicId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot delete users belonging to another clinic" },
        { status: 403 }
      );
    }
    if (targetUser.role !== UserRole.Staff) {
      return NextResponse.json(
        { error: "Forbidden: Admins can only delete staff members" },
        { status: 403 }
      );
    }
  } else {
    // Staff cannot delete users
    return NextResponse.json(
      { error: "Forbidden: Staff are not permitted to delete users" },
      { status: 403 }
    );
  }

  await UserRepository.deleteUser(id);
  return NextResponse.json(
    { message: "User deleted successfully", id },
    { status: 200 }
  );
}

/**
 * POST /api/users/[id]
 *
 * Supports POST requests for deletion to accommodate RPC-style clients.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  return DELETE(request, context);
}
