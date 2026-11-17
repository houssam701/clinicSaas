import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineKey, HiOutlinePencilSquare } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { teamModuleFor } from "@/lib/permission-grid";
import { DeleteUserButton } from "@/components/platform/delete-user-button";
import { Pagination } from "@/components/ui/pagination";
import { totalPages } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { UserRole, type PublicUser } from "@/types/users";

const ROLE_BADGE: Record<string, string> = {
  [UserRole.Admin]: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  [UserRole.Staff]: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const NOTICES = {
  created: "Team member added. Set what they can do with Access.",
  updated: "Team member updated.",
};

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const rowButton =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

/**
 * Server Component: Team
 *
 * An Admin's own clinic team via GET /api/users (Admin flow), which already
 * returns only the roles they may see. Buttons follow their "Staff" and
 * "Admins" permissions; the API checks every action again.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; page?: string; created?: string; updated?: string }>;
}) {
  const { role, page: pageParam, created, updated } = await searchParams;
  const notice = created ? NOTICES.created : updated ? NOTICES.updated : undefined;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const access = await loadMyAccess();
  const grid = access?.grid;
  const seesStaff = !!grid?.Staff.can_view;
  const seesAdmins = !!grid?.Admins.can_view;
  const canCreate = !!(grid?.Staff.can_create || grid?.Admins.can_create);
  const roleFilter = role === UserRole.Admin || role === UserRole.Staff ? role : undefined;

  const usersRes = seesStaff || seesAdmins
    ? await serverApiFetch(API_PATHS.users.list({ role: roleFilter, page, limit: PAGE_SIZE }))
    : null;
  const { users = [], total = 0 }: { users?: PublicUser[]; total?: number } = usersRes?.ok
    ? await usersRes.json()
    : {};
  const loadError = !!usersRes && !usersRes.ok;

  // Past the last page (e.g. its last row was just deleted): go to the last real page
  const lastPage = totalPages(total, PAGE_SIZE);
  if (!loadError && total > 0 && page > lastPage) {
    redirect(PATHS.team.list({ role: roleFilter, page: lastPage }));
  }

  const filters = [
    { label: "All" },
    ...(seesAdmins ? [{ label: "Admins", value: UserRole.Admin }] : []),
    ...(seesStaff ? [{ label: "Staff", value: UserRole.Staff }] : []),
  ];
  const may = (target: PublicUser, action: "can_edit" | "can_delete") =>
    !!grid?.[teamModuleFor(target.role)][action];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Team</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            The people in your clinic, and what each of them can do.
          </p>
        </div>
        {canCreate && (
          <Link
            href={PATHS.team.new}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
          >
            + New team member
          </Link>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {!seesStaff && !seesAdmins ? (
        <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-10 text-center">
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to your team.</p>
          <p className="mt-1 text-sm text-slate-500">Ask the platform administrator to give you access to Staff or Admins.</p>
        </div>
      ) : (
        <>
          {/* Role filter (only when both roles are visible) */}
          {seesStaff && seesAdmins && (
            <nav aria-label="Filter by role" className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const active = (roleFilter ?? "") === (filter.value ?? "");
                return (
                  <Link
                    key={filter.label}
                    href={PATHS.team.list({ role: filter.value })}
                    aria-current={active ? "page" : undefined}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                      active
                        ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
            {loadError ? (
              <p className="p-8 text-center text-sm text-red-600">Could not load your team. Please refresh the page.</p>
            ) : users.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-700 dark:text-slate-200">No team members yet.</p>
                {canCreate && <p className="mt-1 text-sm text-slate-500">Add your first team member to get started.</p>}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Added</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => {
                    const name = `${user.first_name} ${user.last_name}`;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <span className="block font-semibold text-slate-800 dark:text-white">{name}</span>
                          <span className="block text-slate-500 dark:text-slate-400">{user.email}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${ROLE_BADGE[user.role]}`}>{user.role}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {may(user, "can_edit") && (
                              <>
                                <Link
                                  href={PATHS.team.access(user.id)}
                                  prefetch={false}
                                  className={rowButton}
                                  aria-label={`Manage access for ${name}`}
                                >
                                  <HiOutlineKey aria-hidden="true" className="h-3.5 w-3.5" />
                                  Access
                                </Link>
                                <Link
                                  href={PATHS.team.edit(user.id)}
                                  prefetch={false}
                                  className={rowButton}
                                  aria-label={`Edit ${name}`}
                                >
                                  <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
                                  Edit
                                </Link>
                              </>
                            )}
                            {may(user, "can_delete") && <DeleteUserButton userId={user.id} userName={name} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!loadError && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              itemLabel={total === 1 ? "team member" : "team members"}
              hrefForPage={(p) => PATHS.team.list({ role: roleFilter, page: p })}
            />
          )}
        </>
      )}
    </div>
  );
}
