import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";

/** Team pages are for Admins; what each Admin may do there is checked by the API. */
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole([UserRole.Admin]);
  return children;
}
