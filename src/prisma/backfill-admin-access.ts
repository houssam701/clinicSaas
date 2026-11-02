import "dotenv/config";
import { db, connectDatabase } from "./db";
import { PERMISSION_MODULES } from "../config/permissions";

/**
 * One-off: Admins used to bypass every permission check. Now they are checked
 * like Staff, so every existing Admin without any permission rows gets full
 * access, keeping what they could do before. Safe to run again: Admins who
 * already have rows are skipped.
 *
 *   npx tsx src/prisma/backfill-admin-access.ts
 */
async function main() {
  await connectDatabase();

  const admins = await db.orm.public.User.select("id", "email").where({ role: "Admin" }).all();
  let updated = 0;

  for (const admin of admins) {
    const existing = await db.orm.public.UserPermission
      .where({ user_id: admin.id })
      .aggregate((a) => ({ count: a.count() }));
    if (existing.count > 0) continue;

    for (const module_name of PERMISSION_MODULES) {
      await db.orm.public.UserPermission.create({
        user_id: admin.id,
        module_name,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
      });
    }
    updated++;
    console.log(`✅ Full access granted to ${admin.email}`);
  }

  console.log(`Done: ${updated} of ${admins.length} admin(s) updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
