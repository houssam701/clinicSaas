import "dotenv/config";
import { db, connectDatabase } from "./db";

/**
 * One-off: clinic-wide finance figures (totals, every patient's treatments)
 * moved from "Finances" to the new "Reports" permission. So nobody loses what
 * they could see, everyone who can view Finances gets View on Reports; their
 * admin can then take it away per person on the Access page.
 * Safe to run again: users who already have a Reports row are skipped.
 *
 *   npx tsx src/prisma/backfill-reports-access.ts
 */
async function main() {
  await connectDatabase();

  const financeViewers = await db.orm.public.UserPermission
    .select("user_id")
    .where({ module_name: "Finances", can_view: true })
    .all();
  let granted = 0;

  for (const { user_id } of financeViewers) {
    const existing = await db.orm.public.UserPermission
      .where({ user_id, module_name: "Reports" })
      .aggregate((a) => ({ count: a.count() }));
    if (existing.count > 0) continue;

    await db.orm.public.UserPermission.create({
      user_id,
      module_name: "Reports",
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
    });
    granted++;
  }

  console.log(`Done: Reports (view) granted to ${granted} of ${financeViewers.length} user(s) who can view Finances.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
