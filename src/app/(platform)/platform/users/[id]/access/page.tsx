import { notFound } from "next/navigation";
import { PATHS } from "@/config/path";
import { loadAccessPage } from "@/lib/access-page";
import { UserAccessView } from "@/components/access/user-access-view";
import { UserRole } from "@/types/users";

/**
 * Server Component: User Access (platform)
 *
 * The SuperAdmin sets what an Admin or Staff member can do. Saving replaces
 * every row via PUT /api/users/[id]/permissions and trims the access of
 * everyone that user created.
 */
export default async function UserAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadAccessPage(id);

  // The single SuperAdmin is never restricted
  if (!data || (data !== "error" && data.user.role === UserRole.SuperAdmin)) notFound();

  return <UserAccessView data={data} backHref={PATHS.platform.users.list()} backLabel="Back to users" />;
}
