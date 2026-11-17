import { BackLink } from "@/components/ui/back-link";
import { PermissionsForm } from "@/components/platform/permissions-form";
import { updateUserPermissionsAction } from "@/actions/update-user-permissions";
import { modulesForRole } from "@/lib/permission-grid";
import type { AccessPageData } from "@/lib/access-page";
import { UserRole } from "@/types/users";

const ROLE_INTRO: Record<string, string> = {
  [UserRole.Admin]: "Choose what this admin can do in their clinic, including whether they can manage staff and other admins.",
  [UserRole.Staff]: "Choose what this staff member can see and do in each part of their clinic.",
};

export interface UserAccessViewProps {
  data: AccessPageData | "error";
  /** Where "Back to …" goes, from PATHS */
  backHref: string;
  backLabel: string;
}

/**
 * Body of an access page (platform or clinic). The page loads the data with
 * loadAccessPage and handles not-found; this renders the header and the grid.
 */
export function UserAccessView({ data, backHref, backLabel }: UserAccessViewProps) {
  if (data === "error") {
    return (
      <div className="max-w-4xl space-y-6">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          Could not load this user&apos;s permissions. Please refresh the page.
        </p>
      </div>
    );
  }

  const { user, grid, ceiling, unknownModules } = data;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <BackLink href={backHref}>{backLabel}</BackLink>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Access for {user.first_name} {user.last_name}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">{ROLE_INTRO[user.role]}</p>
      </div>

      {unknownModules.length > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Some saved permissions use unknown module names ({unknownModules.join(", ")}) and are ignored.
          Your next save removes them.
        </p>
      )}

      <PermissionsForm
        action={updateUserPermissionsAction.bind(null, user.id)}
        initialGrid={grid}
        modules={modulesForRole(user.role)}
        ceiling={ceiling}
      />
    </div>
  );
}
