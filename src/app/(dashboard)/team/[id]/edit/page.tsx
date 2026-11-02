import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { BackLink } from "@/components/ui/back-link";
import { UserForm } from "@/components/platform/user-form";
import { updateTeamMemberAction } from "@/actions/update-team-member";
import { UserRole, type PublicUser } from "@/types/users";

/**
 * Server Component: Edit Team Member
 *
 * Loads the user (GET /api/users/[id], same clinic only). The role is shown
 * but cannot be changed here; the form submits to PATCH /api/users/[id] via
 * updateTeamMemberAction, which checks can_edit on "Staff" / "Admins".
 */
export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const userRes = await serverApiFetch(API_PATHS.users.detail(id));
  if (!userRes.ok) notFound();
  const { user }: { user: PublicUser } = await userRes.json();
  if (user.role === UserRole.SuperAdmin) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <BackLink href={PATHS.team.list()}>Back to team</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Edit {user.first_name} {user.last_name}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Update their details or password. To change what they can do, use Access.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <UserForm
          mode="edit"
          action={updateTeamMemberAction.bind(null, user.id)}
          roles={[user.role as UserRole]}
          cancelHref={PATHS.team.list()}
          initialValues={{
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role as UserRole,
            clinic_id: user.clinic_id ?? "",
          }}
        />
      </div>
    </div>
  );
}
