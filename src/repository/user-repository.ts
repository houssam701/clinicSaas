import { db } from "../prisma/db";
import type { UsersModel, PublicUser, CreateUserInput, UpdateUserData } from "../types/users";
import { UserRole } from "../types/users";
import { pageOffset, type PaginatedResult, type PaginationInput } from "../types/pagination";

type UserListFilter = {
  clinic_id?: string;
  role?: UserRole;
  excludeUserId?: string;
};

export class UserRepository {

  // ── Auth ────────────────────────────────────────────────────────────────────

  /**
   * Returns the full user row including password_hash.
   * Used only during login to verify credentials.
   */
  static async findByEmail(email: string): Promise<UsersModel | null> {
    const user = await db.orm.public.User
      .where((u) => u.email.eq(email))
      .first();
    // Prisma 8 .first() returns the model row or null — shape matches UsersModel
    return user ?? null;
  }

  /**
   * Returns the public user shape by ID — password_hash is excluded.
   * Used for /auth/me and post-creation responses.
   */
  static async findById(id: string): Promise<PublicUser | null> {
    const user = await db.orm.public.User
      .select("id", "clinic_id", "role", "first_name", "last_name", "email", "created_at", "updated_at")
      .first({ id });
    // .select() narrows the return to only the listed fields — matches PublicUser exactly
    return user ?? null;
  }

  // ── User Creation ────────────────────────────────────────────────────────────

  /**
   * Persists a new user to the database.
   * password_hash must be hashed before calling this — never pass a raw password.
   * Returns PublicUser (no password_hash).
   */
  static async createUser(
    data: CreateUserInput & { password_hash: string }
  ): Promise<PublicUser> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = data; // strip raw password before insert
    // .select() before .create() narrows the returned row — password_hash is not listed
    const user = await db.orm.public.User
      .select("id", "clinic_id", "role", "first_name", "last_name", "email", "created_at", "updated_at")
      .create(rest);
    return user;
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Returns a list of public users filtered by optional clinic_id and/or role.
   * Can exclude a specific user ID (e.g. the calling SuperAdmin).
   * Results are sorted by creation date descending.
   */
  static async findAll(filter?: UserListFilter): Promise<PublicUser[]> {
    return UserRepository.listQuery(filter).orderBy((u) => u.created_at.desc()).all();
  }

  /**
   * Same filters as findAll, one page at a time.
   * The page rows and the total count run in parallel.
   */
  static async findPage(
    filter: UserListFilter & PaginationInput
  ): Promise<PaginatedResult<PublicUser>> {
    const query = UserRepository.listQuery(filter);
    const [data, agg] = await Promise.all([
      query
        .orderBy((u) => u.created_at.desc())
        .limit(filter.limit)
        .offset(pageOffset(filter))
        .all(),
      query.aggregate((a) => ({ count: a.count() })),
    ]);
    return { data, total: agg.count };
  }

  /** Builds the filtered user query shared by findAll and findPage. */
  private static listQuery(filter?: UserListFilter) {
    let query = db.orm.public.User.select(
      "id",
      "clinic_id",
      "role",
      "first_name",
      "last_name",
      "email",
      "created_at",
      "updated_at"
    );

    const clinicId = filter?.clinic_id;
    if (clinicId) {
      query = query.where({ clinic_id: clinicId });
    }

    const role = filter?.role;
    if (role) {
      query = query.where({ role });
    }

    const excludeUserId = filter?.excludeUserId;
    if (excludeUserId) {
      query = query.where((u) => u.id.neq(excludeUserId));
    }

    return query;
  }

  // ── User Mutation ────────────────────────────────────────────────────────────

  /**
   * Updates an existing user and returns the updated public user shape.
   */
  static async updateUser(
    id: string,
    data: UpdateUserData
  ): Promise<PublicUser | null> {
    const updated = await db.orm.public.User
      .where({ id })
      .select("id", "clinic_id", "role", "first_name", "last_name", "email", "created_at", "updated_at")
      .update(data);
    return updated ?? null;
  }

  /**
   * Deletes a user by ID. Cleans up dependent user_permissions and unlinks appointments
   * inside a transaction to maintain referential integrity.
   */
  static async deleteUser(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // 1. Delete associated permissions if any exist
      await tx.orm.public.UserPermission.where({ user_id: id }).delete();

      // 2. Unassign staff from appointments (set user_id to null)
      await tx.orm.public.Appointment.where({ user_id: id }).update({ user_id: null });

      // 3. Delete user
      await tx.orm.public.User.where({ id }).delete();

      return true;
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns true if an account with this email already exists. */
  static async emailExists(email: string): Promise<boolean> {
    const result = await db.orm.public.User
      .where((u) => u.email.eq(email))
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  /** Returns true if an account with this email already exists for another user. */
  static async emailExistsExcept(email: string, excludeUserId: string): Promise<boolean> {
    const result = await db.orm.public.User
      .where((u) => u.email.eq(email))
      .where((u) => u.id.neq(excludeUserId))
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }

  /** Returns true if at least one SuperAdmin exists — used by the bootstrap endpoint. */
  static async superAdminExists(): Promise<boolean> {
    const result = await db.orm.public.User
      .where({ role: "SuperAdmin" })
      .aggregate((a) => ({ count: a.count() }));
    return result.count > 0;
  }
}