import { db } from "../prisma/db";

/** Reset links (only token hashes are stored; see contract.prisma PasswordResetToken). */
export class PasswordResetRepository {
  /** Stores a new link for the user; any earlier unused link stops working. */
  static async create(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.orm.public.PasswordResetToken.where({ user_id: userId }).deleteAndCount();
      await tx.orm.public.PasswordResetToken.create({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
    });
  }

  /** Whether a link is unused and not expired. */
  static async isValid(tokenHash: string, now: string): Promise<boolean> {
    const row = await db.orm.public.PasswordResetToken
      .where({ token_hash: tokenHash })
      .where((t) => t.used_at.isNull())
      .where((t) => t.expires_at.gt(now))
      .aggregate((a) => ({ count: a.count() }));
    return row.count > 0;
  }

  /**
   * Uses a link once: marks it used (a conditional update, so two clicks at
   * the same moment cannot both succeed), sets the new password hash and
   * removes the user's other links. Returns the user's email, or null when
   * the link is unknown, used or expired.
   */
  static async consume(tokenHash: string, now: string, passwordHash: string): Promise<string | null> {
    return db.transaction(async (tx) => {
      const claimed = await tx.orm.public.PasswordResetToken
        .where({ token_hash: tokenHash })
        .where((t) => t.used_at.isNull())
        .where((t) => t.expires_at.gt(now))
        .updateAndCount({ used_at: now });
      if (claimed !== 1) return null;

      const token = await tx.orm.public.PasswordResetToken.select("user_id").first({ token_hash: tokenHash });
      const user = await tx.orm.public.User.where({ id: token!.user_id }).select("email").update({ password_hash: passwordHash });
      await tx.orm.public.PasswordResetToken
        .where({ user_id: token!.user_id })
        .where((t) => t.token_hash.neq(tokenHash))
        .deleteAndCount();
      return user?.email ?? null;
    });
  }

  /** Deletes links that expired before `before` (ISO instant). */
  static async pruneExpired(before: string): Promise<void> {
    await db.orm.public.PasswordResetToken.where((t) => t.expires_at.lt(before)).deleteAndCount();
  }
}
