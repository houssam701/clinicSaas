import { redirect } from "next/navigation";
import { PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { UserForm } from "@/components/platform/user-form";
import { createTeamMemberAction } from "@/actions/create-team-member";
import { loadMyAccess } from "@/lib/access-page";
import { UserRole } from "@/types/users";

/**
 * Server Component: New Team Member
 *
 * Offers the roles the Admin may create (can_create on "Staff" / "Admins").
 * The form posts to POST /api/admin/users through createTeamMemberAction;
 * the clinic always comes from the Admin's session.
 */
export default async function NewTeamMemberPage() {
  const access = await loadMyAccess();
  const roles = [
    ...(access?.grid.Admins.can_create ? [UserRole.Admin] : []),
    ...(access?.grid.Staff.can_create ? [UserRole.Staff] : []),
  ];
  if (roles.length === 0) redirect(PATHS.team.list());

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.team.list()}>Back to team</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          New team member
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          They join your clinic. New staff start with no access; a new admin starts with the same access as you.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <UserForm mode="create" action={createTeamMemberAction} roles={roles} cancelHref={PATHS.team.list()} />
      </div>
    </div>
  );
}
