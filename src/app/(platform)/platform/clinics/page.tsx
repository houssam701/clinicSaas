import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiXMark } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { DeleteClinicButton } from "@/components/platform/delete-clinic-button";
import { ClinicType, type ClinicModel } from "@/types/clinics";
import { Pagination } from "@/components/ui/pagination";
import { FilterForm } from "@/components/ui/filter-form";
import { totalPages } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const TYPE_FILTERS: { label: string; value?: ClinicType }[] = [
  { label: "All" },
  { label: "Dentistry", value: ClinicType.Dentistry },
  { label: "Therapy", value: ClinicType.Therapy },
];

const TYPE_BADGE: Record<ClinicType, string> = {
  [ClinicType.Dentistry]: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  [ClinicType.Therapy]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

const NOTICES = {
  created: "Clinic created. You can now add its admins and staff from Users.",
  updated: "Clinic updated.",
};

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Server Component: Platform Clinics
 *
 * Lists every clinic via GET /api/clinics (SuperAdmin only),
 * filtered by ?clinic_type= and searched by ?search= (name).
 */
export default async function PlatformClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clinic_type?: string;
    search?: string;
    page?: string;
    created?: string;
    updated?: string;
  }>;
}) {
  const { clinic_type, search, page: pageParam, created, updated } = await searchParams;
  const notice = created ? NOTICES.created : updated ? NOTICES.updated : undefined;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const filtered = Boolean(clinic_type || search);

  const clinicsRes = await serverApiFetch(
    API_PATHS.clinics.list({ clinic_type, search, page, limit: PAGE_SIZE })
  );
  const { clinics = [], total = 0 }: { clinics?: ClinicModel[]; total?: number } = clinicsRes.ok
    ? await clinicsRes.json()
    : {};
  const loadError = !clinicsRes.ok;

  // Past the last page (e.g. its last row was just deleted): go to the last real page
  const lastPage = totalPages(total, PAGE_SIZE);
  if (!loadError && total > 0 && page > lastPage) {
    redirect(PATHS.platform.clinics.list({ clinic_type, search, page: lastPage }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Clinics
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Every clinic running on BienSync.
          </p>
        </div>
        <Link
          href={PATHS.platform.clinics.new}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
        >
          + New clinic
        </Link>
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <nav aria-label="Filter by clinic type" className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((filter) => {
            const active = (clinic_type ?? "") === (filter.value ?? "");
            return (
              <Link
                key={filter.label}
                href={PATHS.platform.clinics.list({ clinic_type: filter.value, search })}
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

        {/* Search stays disabled while the box is empty; key resets it after a client-side Reset */}
        <FilterForm
          key={search ?? ""}
          action={PATHS.platform.clinics.list()}
          field="search"
          initialValue={search}
          submitLabel="Search"
          trailing={
            // Shown once a search is applied; clears it but keeps the type tab
            search && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
                <Link
                  href={PATHS.platform.clinics.list({ clinic_type })}
                  aria-label="Reset search"
                  className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  <HiXMark aria-hidden="true" className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
                  Reset
                </Link>
              </>
            )
          }
        >
          {clinic_type && <input type="hidden" name="clinic_type" value={clinic_type} />}
          <label htmlFor="clinic-search" className="sr-only">
            Search clinics by name
          </label>
          <div className="relative w-full sm:w-64">
            <HiOutlineMagnifyingGlass
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="clinic-search"
              name="search"
              type="search"
              defaultValue={search ?? ""}
              placeholder="Search by name"
              className="block h-9 w-full pl-9 pr-3 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white placeholder-slate-400 transition-all hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </FilterForm>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600">Could not load clinics. Please refresh the page.</p>
        ) : clinics.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {filtered ? "No clinics match these filters." : "No clinics yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filtered ? "Try another type or search, or create a new clinic." : "Create the first clinic to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                <th scope="col" className="px-5 py-3 font-semibold">Type</th>
                <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Created</th>
                <th scope="col" className="px-5 py-3 font-semibold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <Link
                      href={PATHS.platform.users.list({ clinic_id: clinic.id })}
                      prefetch={false}
                      className="block font-semibold text-slate-800 dark:text-white hover:text-primary"
                    >
                      {clinic.name}
                    </Link>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">View its users</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${TYPE_BADGE[clinic.clinic_type as ClinicType]}`}>
                      {clinic.clinic_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(clinic.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={PATHS.platform.clinics.edit(clinic.id)}
                        prefetch={false}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
                        aria-label={`Edit ${clinic.name}`}
                      >
                        <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <DeleteClinicButton clinicId={clinic.id} clinicName={clinic.name} />
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
          itemLabel={total === 1 ? "clinic" : "clinics"}
          hrefForPage={(p) => PATHS.platform.clinics.list({ clinic_type, search, page: p })}
        />
      )}
    </div>
  );
}
