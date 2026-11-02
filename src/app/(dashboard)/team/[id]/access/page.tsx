import { notFound } from "next/navigation";
import { PATHS } from "@/config/path";
import { loadAccessPage } from "@/lib/access-page";
import { UserAccessView } from "@/components/access/user-access-view";
import { UserRole } from "@/types/users";

/**
 * Server Component: Team Member Access
 *
 * An Admin sets what someone in their clinic can do. Boxes beyond the Admin's
 * own access are locked; PUT /api/users/[id]/permissions enforces the same
 * ceiling and trims everyone that user created.
 */
export default async function TeamMemberAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadAccessPage(id);

  // Nobody changes their own access, and the SuperAdmin is never listed here
  if (!data || (data !== "error" && (data.user.role === UserRole.SuperAdmin || data.user.id === data.me.id))) {
    notFound();
  }

  return <UserAccessView data={data} backHref={PATHS.team.list()} backLabel="Back to team" />;
}
