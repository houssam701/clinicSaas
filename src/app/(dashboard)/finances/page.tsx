import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineBanknotes, HiOutlineClock, HiOutlineMagnifyingGlass, HiXMark } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { formatDate, patientName } from "@/lib/patient-format";
import { formatMoney, toCents } from "@/lib/money";
import { todayIn, zonedTimeToUtc } from "@/lib/time-zone";
import { totalPages } from "@/lib/pagination";
import { FilterForm } from "@/components/ui/filter-form";
import { Pagination } from "@/components/ui/pagination";
import { InvoiceStatusBadge, PaidBar, INVOICE_STATUS_LABELS } from "@/components/finances/invoice-status";
import { InvoiceStatus, type InvoiceSummary } from "@/types/invoices";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { cn } from "@/lib/utils";
import { isValidUuid } from "@/services/api-guard";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const NOTICES = { deleted: "Treatment deleted." };

/** Tabs: all, the two "still owed" ones, and paid. */
const TABS: { label: string; status?: InvoiceStatus }[] = [
  { label: "All" },
  { label: INVOICE_STATUS_LABELS[InvoiceStatus.Unpaid], status: InvoiceStatus.Unpaid },
  { label: INVOICE_STATUS_LABELS[InvoiceStatus.Partial], status: InvoiceStatus.Partial },
  { label: INVOICE_STATUS_LABELS[InvoiceStatus.Paid], status: InvoiceStatus.Paid },
];

/**
 * Server Component: Finances
 *
 * The clinic's treatments (invoices) with what is paid and what is left,
 * filtered by status and searched by patient, plus two totals: what is still
 * owed, and what was collected this month. Amounts use the clinic's currency.
 */
export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; deleted?: string; patient?: string }>;
}) {
  const params = await searchParams;
  const access = await loadMyAccess();
  const can = access?.grid.Finances;

  if (!can?.can_view) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Finances</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to finances.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin to give you access to Finances.</p>
        </div>
      </div>
    );
  }

  const currency = access!.clinic?.currency;
  const zone = access!.clinic?.timezone ?? "UTC";
  const status = Object.values(InvoiceStatus).includes(params.status as InvoiceStatus) ? (params.status as InvoiceStatus) : undefined;
  const search = params.search?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const patient = params.patient && isValidUuid(params.patient) ? params.patient : undefined;
  const monthStart = zonedTimeToUtc(`${todayIn(zone).slice(0, 7)}-01`, "00:00", zone).toISOString();

  // The clinic-wide view (totals, every patient) is a report; one patient's list is not
  const canReports = !!access!.grid.Reports.can_view;
  if (!canReports && !patient) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Finances</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">The clinic&apos;s finance overview is not part of your access.</p>
          <p className="mt-1 text-sm text-slate-500">
            Each patient&apos;s treatments and what they owe are on their page, under Finances.{" "}
            {access!.grid.Patients.can_view && (
              <Link href={PATHS.patients.list()} className="font-semibold text-primary hover:underline">
                Go to patients
              </Link>
            )}
          </p>
        </div>
      </div>
    );
  }

  const [listRes, summaryRes] = await Promise.all([
    serverApiFetch(API_PATHS.invoices.list({ status, search, patient_id: patient, page, limit: PAGE_SIZE })),
    canReports ? serverApiFetch(API_PATHS.invoices.summary({ from: monthStart })) : null,
  ]);
  const { invoices = [], total = 0 }: { invoices?: InvoiceSummary[]; total?: number } = listRes.ok ? await listRes.json() : {};
  const summary: { outstanding?: string; collected?: string } = summaryRes?.ok ? await summaryRes.json() : {};
  const loadError = !listRes.ok;

  if (!loadError && total > 0 && page > totalPages(total, PAGE_SIZE)) {
    redirect(PATHS.finances.list({ status, search, patient, page: totalPages(total, PAGE_SIZE) }));
  }
  const money = (amount: string) => formatMoney(toCents(amount), currency);
  const notice = params.deleted ? NOTICES.deleted : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Finances</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Treatments, what each patient has paid, and what is still owed.
          </p>
        </div>
        {can.can_create && (
          <Link
            href={PATHS.finances.new()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
          >
            + New treatment
          </Link>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Totals */}
      {summaryRes?.ok && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href={PATHS.finances.list({ status: InvoiceStatus.Unpaid })} className={`${card} flex items-center gap-4 p-5 hover:border-primary/40`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <HiOutlineClock aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-black tracking-tight text-slate-800 dark:text-white tabular-nums">{money(summary.outstanding ?? "0")}</span>
              <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">Still to collect</span>
            </span>
          </Link>
          <div className={`${card} flex items-center gap-4 p-5`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <HiOutlineBanknotes aria-hidden="true" className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-black tracking-tight text-slate-800 dark:text-white tabular-nums">{money(summary.collected ?? "0")}</span>
              <span className="block text-sm font-medium text-slate-500 dark:text-slate-400">Collected this month</span>
            </span>
          </div>
        </div>
      )}

      {patient && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200">
          <span>
            Showing the treatments of <strong>{invoices[0]?.patient ? patientName(invoices[0].patient) : "one patient"}</strong>
          </span>
          {canReports ? (
            <Link href={PATHS.finances.list({ status, search })} className="font-semibold text-primary hover:underline">
              Show everyone
            </Link>
          ) : (
            access!.grid.Patients.can_view && (
              <Link href={PATHS.patients.detail(patient)} className="font-semibold text-primary hover:underline">
                Patient file
              </Link>
            )
          )}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = (status ?? "") === (tab.status ?? "");
            return (
              <Link
                key={tab.label}
                href={PATHS.finances.list({ status: tab.status, search, patient })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors",
                  active
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <FilterForm
          key={search ?? ""}
          action={PATHS.finances.list()}
          field="search"
          initialValue={search}
          submitLabel="Search"
          trailing={
            search && (
              <>
                <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
                <Link
                  href={PATHS.finances.list({ status, patient })}
                  aria-label="Reset search"
                  className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <HiXMark aria-hidden="true" className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
                  Reset
                </Link>
              </>
            )
          }
        >
          {status && <input type="hidden" name="status" value={status} />}
          {patient && <input type="hidden" name="patient" value={patient} />}
          <label htmlFor="finance-search" className="sr-only">
            Search by patient name, phone or email
          </label>
          <div className="relative w-full sm:w-80">
            <HiOutlineMagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="finance-search"
              name="search"
              type="search"
              defaultValue={search ?? ""}
              placeholder="Search by patient"
              className="block h-9 w-full pl-9 pr-3 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white placeholder-slate-400 transition-all hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </FilterForm>
      </div>

      {/* List */}
      <div className={`overflow-x-auto ${card}`}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600">Could not load treatments. Please refresh the page.</p>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{search || status ? "No treatments match." : "No treatments yet."}</p>
            <p className="mt-1 text-sm text-slate-500">
              {search || status ? "Try another tab or search." : can.can_create ? "Add a treatment's cost with New treatment." : "Treatments added by your clinic appear here."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Treatment</th>
                <th scope="col" className="px-5 py-3 font-semibold">Patient</th>
                <th scope="col" className="px-5 py-3 font-semibold text-right">Total</th>
                <th scope="col" className="px-5 py-3 font-semibold text-right">Left to pay</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold whitespace-nowrap">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <Link href={PATHS.finances.detail(inv.id)} prefetch={false} className="font-semibold text-slate-800 dark:text-white hover:text-primary">
                      {inv.title ?? "Treatment"}
                    </Link>
                    <PaidBar paidCents={toCents(inv.paid_amount)} totalCents={toCents(inv.total_amount)} className="mt-1.5 w-32" />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{inv.patient ? patientName(inv.patient) : "Unknown patient"}</td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">{money(inv.total_amount)}</td>
                  <td className="px-5 py-3.5 text-right font-bold tabular-nums whitespace-nowrap text-slate-800 dark:text-white">
                    {toCents(inv.balance) > 0 ? money(inv.balance) : <span className="font-medium text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(inv.created_at)}</td>
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
          itemLabel={total === 1 ? "treatment" : "treatments"}
          hrefForPage={(p) => PATHS.finances.list({ status, search, patient, page: p })}
        />
      )}
    </div>
  );
}
