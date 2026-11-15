import Link from "next/link";
import Form from "next/form";
import type { IconType } from "react-icons";
import {
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineUserPlus,
} from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { formatDate, patientName } from "@/lib/patient-format";
import { todayIn } from "@/lib/time-zone";
import { formatMoney, toCents } from "@/lib/money";
import { REPORT_PRESETS, monthStart, resolveReportRange } from "@/lib/report-range";
import { MonthlyChart } from "@/components/reports/monthly-chart";
import { Badge } from "@/components/ui/badge";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus } from "@/types/appointments";
import { InvoiceStatus, PAYMENT_METHOD_LABELS } from "@/types/invoices";
import type { ClinicReport, ReportProviderRow } from "@/types/reports";
import { cn } from "@/lib/utils";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";
const th = "px-5 py-3 font-semibold";
const dateInput =
  "mt-1 block h-9 w-40 px-3 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white transition-all hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary";
const num = "px-5 py-3.5 text-right tabular-nums whitespace-nowrap";

const STATUS_ORDER = [AppointmentStatus.Completed, AppointmentStatus.Scheduled, AppointmentStatus.NoShow, AppointmentStatus.Canceled];

const PROVIDER_LABEL: Record<ReportProviderRow["kind"], string> = {
  admin: "",
  unassigned: "Unassigned visits",
  no_visit: "Paid outside a visit",
};

/** Share of `part` in `whole` as "12%", or "—" when there is nothing to divide. */
const percent = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

function Tile({ icon: Icon, label, value, hint, href }: { icon: IconType; label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </span>
      <span className="mt-2 block text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white tabular-nums">{value}</span>
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={`${card} block p-5 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}>
      {body}
    </Link>
  ) : (
    <div className={`${card} p-5`}>{body}</div>
  );
}

/**
 * Server Component: Reports
 *
 * The clinic's figures for a period (this month by default, a preset, or
 * custom dates): money received, cost of treatments added, what is still
 * owed today, new patients, money per month for the last 12 months, each
 * admin's visits and the money taken at them, payment methods and
 * appointment outcomes. Needs view access on "Reports"; data comes from
 * GET /api/reports.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const access = await loadMyAccess();

  if (!access?.grid.Reports.can_view) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Reports</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to reports.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin to give you access to Reports.</p>
        </div>
      </div>
    );
  }

  const zone = access.clinic?.timezone ?? "UTC";
  const currency = access.clinic?.currency;
  const today = todayIn(zone);
  const { from, to, preset } = resolveReportRange(params, today);

  const res = await serverApiFetch(API_PATHS.reports({ from, to }));
  const report: ClinicReport | null = res.ok ? (await res.json()).report : null;
  const money = (amount: string) => formatMoney(toCents(amount), currency);
  const canFinances = !!access.grid.Finances.can_view;

  // Months of the chart that fall inside the period
  const inPeriod = new Set<string>();
  for (let m = monthStart(from); m <= to; m = monthStart(m, 1)) inPeriod.add(m.slice(0, 7));

  const appts = report?.appointments;
  const done = appts ? appts.by_status.Completed + appts.by_status.NoShow : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Reports</h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          {from === to ? formatDate(from, "long") : `${formatDate(from, "long")} – ${formatDate(to, "long")}`}
        </p>
      </div>

      {/* Period */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <nav aria-label="Period" className="flex flex-wrap gap-2">
          {REPORT_PRESETS.map((p) => {
            const active = preset === p.id;
            return (
              <Link
                key={p.id}
                href={PATHS.reports({ range: p.id === "this-month" ? undefined : p.id })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors",
                  active
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
        <Form key={`${from}-${to}`} action={PATHS.reports()} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            From
            <input type="date" name="from" defaultValue={from} max={today} required className={dateInput} />
          </label>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            To
            <input type="date" name="to" defaultValue={to} required className={dateInput} />
          </label>
          <button
            type="submit"
            className="h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
          >
            Show
          </button>
        </Form>
      </div>

      {!report ? (
        <div className={`${card} p-8 text-center text-sm text-red-600`}>Could not load the report. Please refresh the page.</div>
      ) : (
        <>
          {/* Headline figures */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              icon={HiOutlineBanknotes}
              label="Received"
              value={money(report.collected.total)}
              hint={`${report.collected.count} ${report.collected.count === 1 ? "payment" : "payments"}`}
            />
            <Tile icon={HiOutlineClipboardDocumentList} label="Treatments added" value={money(report.billed)} hint="Their total cost" />
            <Tile
              icon={HiOutlineClock}
              label="Still to collect"
              value={money(report.outstanding)}
              hint="Today, on all open treatments"
              href={canFinances ? PATHS.finances.list({ status: InvoiceStatus.Unpaid }) : undefined}
            />
            <Tile icon={HiOutlineUserPlus} label="New patients" value={String(report.new_patients)} />
          </div>

          {/* Per month */}
          <section className={`${card} p-6`}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-bold text-slate-800 dark:text-white">Received per month</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 12 months · darker bars are in the chosen period</p>
            </div>
            <MonthlyChart
              months={report.months.map((m) => ({ month: m.month, cents: toCents(m.collected), label: money(m.collected) }))}
              inPeriod={inPeriod}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Per admin */}
            <section className={`${card} overflow-x-auto xl:col-span-2`}>
              <h2 className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 font-bold text-slate-800 dark:text-white">By admin</h2>
              {report.providers.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No admins in this clinic yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th scope="col" className={th}>Admin</th>
                      <th scope="col" className={`${th} text-right`}>Appointments</th>
                      <th scope="col" className={`${th} text-right`}>Completed</th>
                      <th scope="col" className={`${th} text-right`}>No-shows</th>
                      <th scope="col" className={`${th} text-right`}>Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.providers.map((row) => (
                      <tr key={row.user?.id ?? row.kind}>
                        <th scope="row" className={cn("px-5 py-3.5 font-semibold whitespace-nowrap", row.user ? "text-slate-800 dark:text-white" : "font-medium text-slate-500 dark:text-slate-400")}>
                          {row.user ? patientName(row.user) : PROVIDER_LABEL[row.kind]}
                        </th>
                        <td className={`${num} text-slate-600 dark:text-slate-300`}>{row.kind === "no_visit" ? "—" : row.appointments}</td>
                        <td className={`${num} text-slate-600 dark:text-slate-300`}>{row.kind === "no_visit" ? "—" : row.completed}</td>
                        <td className={`${num} text-slate-600 dark:text-slate-300`}>{row.kind === "no_visit" ? "—" : row.no_show}</td>
                        <td className={`${num} font-bold text-slate-800 dark:text-white`}>{money(row.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Payment methods */}
            <section className={card}>
              <h2 className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 font-bold text-slate-800 dark:text-white">How patients paid</h2>
              {report.collected.by_method.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No payments in this period.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.collected.by_method.map((m) => (
                    <li key={m.method} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800 dark:text-white">{PAYMENT_METHOD_LABELS[m.method]}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {m.count} {m.count === 1 ? "payment" : "payments"} · {percent(toCents(m.amount), toCents(report.collected.total))}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums text-slate-800 dark:text-white">{money(m.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Appointments */}
          <section className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h2 className="font-bold text-slate-800 dark:text-white">Appointments</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{appts!.total}</span> in this period
                {done > 0 && (
                  <>
                    {" · "}No-show rate{" "}
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{percent(appts!.by_status.NoShow, done)}</span>
                  </>
                )}
              </p>
            </div>
            <dl className="grid grid-cols-2 divide-slate-100 dark:divide-slate-800 sm:grid-cols-4 sm:divide-x">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="px-5 py-4">
                  <dt>
                    <Badge tone={STATUS_STYLE[status].tone}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>
                  </dt>
                  <dd className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums tracking-tight text-slate-800 dark:text-white">{appts!.by_status[status]}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{percent(appts!.by_status[status], appts!.total)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}
