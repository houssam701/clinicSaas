import { db } from "../prisma/db";
import type { UsersModel, PublicUser, CreateUserInput } from "../types/users";

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns true if an account with this email already exists. */
  static async emailExists(email: string): Promise<boolean> {
    const result = await db.orm.public.User
      .where((u) => u.email.eq(email))
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