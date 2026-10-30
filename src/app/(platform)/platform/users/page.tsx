import Link from "next/link";
import Form from "next/form";
import { serverApiFetch } from "@/lib/server-api";
import { UserRole, type PublicUser } from "@/types/users";
import type { ClinicModel } from "@/types/clinics";

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

function buildQuery(params: { role?: string; clinic_id?: string }) {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.clinic_id) query.set("clinic_id", params.clinic_id);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Server Component: Platform Users
 *
 * Lists every user across all clinics via GET /api/users (SuperAdmin flow),
 * filtered by ?role= and ?clinic_id=. Clinic names come from GET /api/clinics.
 */
export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; clinic_id?: string; created?: string }>;
}) {
  const { role, clinic_id, created } = await searchParams;

  const [usersRes, clinicsRes] = await Promise.all([
    serverApiFetch(`/api/users${buildQuery({ role, clinic_id })}`),
    serverApiFetch("/api/clinics"),
  ]);

  const users: PublicUser[] = usersRes.ok ? (await usersRes.json()).users : [];
  const clinics: ClinicModel[] = clinicsRes.ok ? (await clinicsRes.json()).clinics : [];
  const clinicName = new Map(clinics.map((c) => [c.id, c.name]));
  const loadError = !usersRes.ok;

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
          href="/platform/users/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
        >
          + New user
        </Link>
      </div>

      {created && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          User created. They can now sign in with the email and password you set.
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
                href={`/platform/users${buildQuery({ role: filter.value, clinic_id })}`}
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
        <Form action="/platform/users" className="flex items-center gap-2">
          {role && <input type="hidden" name="role" value={role} />}
          <label htmlFor="clinic-filter" className="sr-only">
            Filter by clinic
          </label>
          <select
            id="clinic-filter"
            name="clinic_id"
            defaultValue={clinic_id ?? ""}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-primary/20"
          >
            <option value="">All clinics</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Apply
          </button>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loadError && users.length > 0 && (
        <p className="text-xs text-slate-500">
          {users.length} {users.length === 1 ? "user" : "users"} · your own account is not listed
        </p>
      )}
    </div>
  );
}
