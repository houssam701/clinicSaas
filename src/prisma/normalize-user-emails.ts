import "dotenv/config";
import { db, connectDatabase } from "./db";
import { normalizeEmail } from "../lib/email-address";

/**
 * One-off: stores every account email in its normalized form (trimmed,
 * lowercase), so sign-in and password reset match however people type it.
 * New and edited users are normalized by the app; this fixes older rows.
 *
 * Accounts whose emails differ only by case ("ana@x.com" and "Ana@x.com")
 * are listed and left unchanged: decide which one to keep, then run again.
 *
 *   npx tsx src/prisma/normalize-user-emails.ts           (report only)
 *   npx tsx src/prisma/normalize-user-emails.ts --apply   (make the changes)
 */
async function main() {
  const apply = process.argv.includes("--apply");
  await connectDatabase();

  // The users table is small; a one-off script may read it whole
  const users = await db.orm.public.User.select("id", "email", "role", "clinic_id").all();
  const byNormalized = new Map<string, typeof users>();
  for (const u of users) {
    const key = normalizeEmail(u.email);
    byNormalized.set(key, [...(byNormalized.get(key) ?? []), u]);
  }

  const conflicts = [...byNormalized.entries()].filter(([, group]) => group.length > 1);
  const toFix = users.filter((u) => u.email !== normalizeEmail(u.email) && byNormalized.get(normalizeEmail(u.email))!.length === 1);

  console.log(`${users.length} user(s); ${toFix.length} email(s) to normalize; ${conflicts.length} conflict(s).`);
  for (const u of toFix) console.log(`  ${u.email}  →  ${normalizeEmail(u.email)}`);
  for (const [email, group] of conflicts) {
    console.log(`  CONFLICT ${email}: ${group.map((u) => `${u.email} (${u.role}, id ${u.id})`).join(", ")} — left unchanged`);
  }

  if (!apply) {
    console.log(toFix.length ? "Report only. Run again with --apply to make the changes." : "Nothing to change.");
    return;
  }
  for (const u of toFix) {
    await db.orm.public.User.where({ id: u.id }).updateAndCount({ email: normalizeEmail(u.email) });
  }
  console.log(`Done: ${toFix.length} email(s) normalized.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
