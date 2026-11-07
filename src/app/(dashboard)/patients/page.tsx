import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiXMark } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { ageFrom, formatDate, patientName } from "@/lib/patient-format";
import { deletePatientAction } from "@/actions/delete-patient";
import { DeleteButton } from "@/components/ui/delete-button";
import { FilterForm } from "@/components/ui/filter-form";
import { Pagination } from "@/components/ui/pagination";
import { totalPages } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { PatientModel } from "@/types/patients";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const NOTICES = {
  deleted: "Patient deleted.",
};

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const rowButton =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

/**
 * Server Component: Patients
 *
 * The clinic's patients via GET /api/patients (always scoped to the caller's
 * clinic), searched by ?search= and paginated by ?page=. Buttons follow the
 * caller's "Patients" access; the API checks every action again.
 */
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; deleted?: string }>;
}) {
  const { search, page: pageParam, deleted } = await searchParams;
  const notice = deleted ? NOTICES.deleted : undefined;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const access = await loadMyAccess();
  const can = access?.grid.Patients;

  if (!can?.can_view) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Patients</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to patients.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin to give you access to Patients.</p>
        </div>
      </div>
    );
  }

  const res = await serverApiFetch(API_PATHS.patients.list({ search, page, limit: PAGE_SIZE }));
  const { patients = [], total = 0 }: { patients?: PatientModel[]; total?: number } = res.ok
    ? await res.json()
    : {};
  const loadError = !res.ok;

  // Past the last page (e.g. its last row was just deleted): go to the last real page
  const lastPage = totalPages(total, PAGE_SIZE);
  if (!loadError && total > 0 && page > lastPage) {
    redirect(PATHS.patients.list({ search, page: lastPage }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Patients</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Everyone your clinic cares for, with their history and documents.
          </p>
        </div>
        {can.can_create && (
          <Link
            href={PATHS.patients.new}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
          >
            + New patient
          </Link>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Search stays disabled while the box is empty; key resets it after a client-side Reset */}
      <FilterForm
        key={search ?? ""}
        action={PATHS.patients.list()}
        field="search"
        initialValue={search}
        submitLabel="Search"
        trailing={
          search && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
              <Link
                href={PATHS.patients.list()}
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
        <label htmlFor="patient-search" className="sr-only">
          Search patients by name, email or phone
        </label>
        <div className="relative w-full sm:w-80">
          <HiOutlineMagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id="patient-search"
            name="search"
            type="search"
            defaultValue={search ?? ""}
            placeholder="Search by name, email or phone"
            className="block h-9 w-full pl-9 pr-3 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white placeholder-slate-400 transition-all hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </FilterForm>

      {/* Table */}
      <div className={`overflow-x-auto ${card}`}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600">Could not load patients. Please refresh the page.</p>
        ) : patients.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {search ? "No patients match this search." : "No patients yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try another name, email or phone number."
                : can.can_create
                  ? "Add your first patient to get started."
                  : "Patients added by your clinic will appear here."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                <th scope="col" className="px-5 py-3 font-semibold">Phone</th>
                <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Date of birth</th>
                <th scope="col" className="px-5 py-3 font-semibold">Gender</th>
                <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Added</th>
                <th scope="col" className="px-5 py-3 font-semibold text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.map((patient) => {
                const name = patientName(patient);
                return (
                  <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <Link
                        href={PATHS.patients.detail(patient.id)}
                        prefetch={false}
                        className="block font-semibold text-slate-800 dark:text-white hover:text-primary"
                      >
                        {name}
                      </Link>
                      {patient.email && (
                        <span className="block text-slate-500 dark:text-slate-400">{patient.email}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {patient.phone ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {patient.date_of_birth ? (
                        <>
                          {formatDate(patient.date_of_birth)}
                          <span className="ml-1.5 text-xs text-slate-400">({ageFrom(patient.date_of_birth)} y)</span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                      {patient.gender ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(patient.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {can.can_edit && (
                          <Link
                            href={PATHS.patients.edit(patient.id)}
                            prefetch={false}
                            className={rowButton}
                            aria-label={`Edit ${name}`}
                          >
                            <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        )}
                        {can.can_delete && (
                          <DeleteButton
                            action={deletePatientAction.bind(null, patient.id)}
                            itemName={name}
                            title={`Delete ${name}?`}
                            description="Their medical history, documents and appointments are removed. Invoices and payments are kept for your records. This cannot be undone."
                            confirmLabel="Delete patient"
                          />
                        )}
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
          itemLabel={total === 1 ? "patient" : "patients"}
          hrefForPage={(p) => PATHS.patients.list({ search, page: p })}
        />
      )}
    </div>
  );
}
