import "dotenv/config";
import { db, connectDatabase } from "./db";

/**
 * One-off: the clinic's own settings (name, time zone, currency) moved from
 * SuperAdmin-only to the new "Settings" permission. So the people who run a
 * clinic can keep it up to date, every existing Admin gets View + Edit on
 * Settings; the SuperAdmin (or their admin) can take it away per person.
 * Safe to run again: Admins who already have a Settings row are skipped.
 *
 *   npx tsx src/prisma/backfill-settings-access.ts
 */
async function main() {
  await connectDatabase();

  const admins = await db.orm.public.User.select("id").where({ role: "Admin" }).all();
  let granted = 0;

  for (const { id } of admins) {
    const existing = await db.orm.public.UserPermission
      .where({ user_id: id, module_name: "Settings" })
      .aggregate((a) => ({ count: a.count() }));
    if (existing.count > 0) continue;

    await db.orm.public.UserPermission.create({
      user_id: id,
      module_name: "Settings",
      can_view: true,
      can_create: false,
      can_edit: true,
      can_delete: false,
    });
    granted++;
  }

  console.log(`Done: Settings (view + edit) granted to ${granted} of ${admins.length} Admin(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
