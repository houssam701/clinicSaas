import Link from "next/link";
import Form from "next/form";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { DeleteUserButton } from "@/components/platform/delete-user-button";
import { HiOutlinePencilSquare, HiXMark } from "react-icons/hi2";
import { UserRole, type PublicUser } from "@/types/users";
import type { ClinicModel } from "@/types/clinics";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { totalPages } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const ROLE_FILTERS: { label: string; value?: UserRole }[] = [
  // No SuperAdmin tab: the only SuperAdmin is the signed-in user, whom the API excludes
  { label: "All" },
  { label: "Admins", value: UserRole.Admin },
  { label: "Staff", value: UserRole.Staff },
];

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  [UserRole.Admin]: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  [UserRole.Staff]: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const NOTICES = {
  created: "User created. They can now sign in with the email and password you set.",
  updated: "User updated.",
};

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Server Component: Platform Users
 *
 * Lists every user across all clinics via GET /api/users (SuperAdmin flow),
 * filtered by ?role= and ?clinic_id=. Clinic names come from GET /api/clinics.
 */
export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    clinic_id?: string;
    page?: string;
    created?: string;
    updated?: string;
  }>;
}) {
  const { role, clinic_id, page: pageParam, created, updated } = await searchParams;
  const notice = created ? NOTICES.created : updated ? NOTICES.updated : undefined;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const [usersRes, clinicsRes] = await Promise.all([
    serverApiFetch(API_PATHS.users.list({ role, clinic_id, page, limit: PAGE_SIZE })),
    serverApiFetch(API_PATHS.clinics.list()),
  ]);

  const { users = [], total = 0 }: { users?: PublicUser[]; total?: number } = usersRes.ok
    ? await usersRes.json()
    : {};
  const clinics: ClinicModel[] = clinicsRes.ok ? (await clinicsRes.json()).clinics : [];
  const clinicName = new Map(clinics.map((c) => [c.id, c.name]));
  const loadError = !usersRes.ok;

  // Past the last page (e.g. its last row was just deleted): go to the last real page
  const lastPage = totalPages(total, PAGE_SIZE);
  if (!loadError && total > 0 && page > lastPage) {
    redirect(PATHS.platform.users.list({ role, clinic_id, page: lastPage }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Users
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Everyone with access to BienSync, across all clinics.
          </p>
        </div>
        <Link
          href={PATHS.platform.users.new}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
        >
          + New user
        </Link>
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <nav aria-label="Filter by role" className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((filter) => {
            const active = (role ?? "") === (filter.value ?? "");
            return (
              <Link
                key={filter.label}
                href={PATHS.platform.users.list({ role: filter.value, clinic_id })}
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

        {/* next/form navigates on the client instead of reloading the page */}
        <Form action={PATHS.platform.users.list()} className="flex items-center gap-2">
          {role && <input type="hidden" name="role" value={role} />}
          <label htmlFor="clinic-filter" className="sr-only">
            Filter by clinic
          </label>
          {/* key remounts it so defaultValue follows the URL after a client-side Reset */}
          <Select
            key={clinic_id ?? "all"}
            id="clinic-filter"
            name="clinic_id"
            size="sm"
            defaultValue={clinic_id ?? ""}
            wrapperClassName="w-full sm:w-56"
          >
            <option value="">All clinics</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="h-9 px-3 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Apply
          </button>
          {/* Shown once a clinic filter is applied; clears it but keeps the role tab */}
          {clinic_id && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
              <Link
                href={PATHS.platform.users.list({ role })}
                aria-label="Reset clinic filter"
                className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <HiXMark aria-hidden="true" className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
                Reset
              </Link>
            </>
          )}
        </Form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600">Could not load users. Please refresh the page.</p>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">No users match these filters.</p>
            <p className="mt-1 text-sm text-slate-500">Try another role or clinic, or create a new user.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                <th scope="col" className="px-5 py-3 font-semibold">Clinic</th>
                <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Created</th>
                <th scope="col" className="px-5 py-3 font-semibold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <span className="block font-semibold text-slate-800 dark:text-white">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="block text-slate-500 dark:text-slate-400">{user.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${ROLE_BADGE[user.role as UserRole]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                    {user.clinic_id ? (clinicName.get(user.clinic_id) ?? "Unknown clinic") : (
                      <span className="text-slate-400">Platform</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={PATHS.platform.users.edit(user.id)}
                        prefetch={false}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
                        aria-label={`Edit ${user.first_name} ${user.last_name}`}
                      >
                        <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <DeleteUserButton userId={user.id} userName={`${user.first_name} ${user.last_name}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loadError && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          itemLabel={total === 1 ? "user" : "users"}
          hrefForPage={(p) => PATHS.platform.users.list({ role, clinic_id, page: p })}
        />
      )}
      {!loadError && total > 0 && (
        <p className="text-xs text-slate-500">Your own account is not listed.</p>
      )}
    </div>
  );
}
