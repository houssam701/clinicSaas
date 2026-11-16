import "dotenv/config";
import { db, connectDatabase } from "./db";

/**
 * Modules that no longer exist in PERMISSION_MODULES. They were never
 * enforced (no page or API route checked them), so removing their rows
 * changes nobody's access.
 */
const RETIRED_MODULES = ["Doctors", "Messages", "Reviews"];

/**
 * One-off: deletes saved permission rows for retired modules, so access
 * pages stop listing them as unknown. Safe to run again.
 *
 *   npx tsx src/prisma/remove-retired-permissions.ts
 */
async function main() {
  await connectDatabase();

  const result = await db.orm.public.UserPermission
    .where((p) => p.module_name.in(RETIRED_MODULES))
    .deleteAndCount();

  console.log(`Done: removed ${result} permission row(s) for ${RETIRED_MODULES.join(", ")}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
