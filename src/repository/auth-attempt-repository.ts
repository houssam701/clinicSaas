import { db } from "../prisma/db";

/** Failed attempts at limited actions (see src/config/auth-limits.ts). */
export class AuthAttemptRepository {
  /** The newest `limit` failures for `key`, newest first (times only). */
  static async latest(key: string, limit: number): Promise<string[]> {
    const rows = await db.orm.public.AuthAttempt
      .select("created_at")
      .where({ key })
      .orderBy((a) => a.created_at.desc())
      .limit(limit)
      .all();
    return rows.map((r) => r.created_at);
  }

  static async add(key: string): Promise<void> {
    await db.orm.public.AuthAttempt.create({ key });
  }

  /** Forgets every failure for `key` (after a success). */
  static async clear(key: string): Promise<void> {
    await db.orm.public.AuthAttempt.where({ key }).deleteAndCount();
  }

  /** Deletes failures older than `before` (ISO instant). */
  static async prune(before: string): Promise<void> {
    await db.orm.public.AuthAttempt.where((a) => a.created_at.lt(before)).deleteAndCount();
  }
}
