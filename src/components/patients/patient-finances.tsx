import Link from "next/link";
import { HiOutlineBanknotes, HiOutlinePlus } from "react-icons/hi2";
import { PATHS } from "@/config/path";
import { formatDate } from "@/lib/patient-format";
import { formatMoney, sumCents, toCents } from "@/lib/money";
import { InvoiceStatusBadge, PaidBar } from "@/components/finances/invoice-status";
import { InvoiceStatus, type InvoiceSummary } from "@/types/invoices";
import { Badge } from "@/components/ui/badge";

/** How many treatments the patient page shows before "See all". */
export const PATIENT_TREATMENTS_SHOWN = 5;

export interface PatientFinancesProps {
  patientId: string;
  /** The latest treatments (up to PATIENT_TREATMENTS_SHOWN) */
  invoices: InvoiceSummary[];
  total: number;
  /** What the patient still owes on all their open treatments (amount string) */
  owed: string;
  currency?: string;
  canCreate: boolean;
  error: boolean;
}

/**
 * The patient's money on their page: what they still owe, their latest
 * treatments with paid / left, and "Add treatment" (with them filled in).
 */
export function PatientFinances({ patientId, invoices, total, owed, currency, canCreate, error }: PatientFinancesProps) {
  const money = (amount: string) => formatMoney(toCents(amount), currency);
  const owedCents = toCents(owed);

  return (
    <section className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <HiOutlineBanknotes aria-hidden="true" className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-slate-800 dark:text-white">Finances</h2>
          {!error &&
            (owedCents > 0 ? (
              <Badge tone="red" variant="tag">
                Owes {money(owed)}
              </Badge>
            ) : (
              <Badge tone="green">Nothing owed</Badge>
            ))}
        </div>
        {canCreate && (
          <Link
            href={PATHS.finances.new({ patient: patientId, back: PATHS.patients.detail(patientId) })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <HiOutlinePlus aria-hidden="true" className="h-3.5 w-3.5" />
            Add treatment
          </Link>
        )}
      </header>

      {error ? (
        <p className="p-6 text-center text-sm text-red-600">Could not load finances. Please refresh the page.</p>
      ) : invoices.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">No treatments yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={PATHS.finances.detail(inv.id)} prefetch={false} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-800 dark:text-white">{inv.title ?? "Treatment"}</span>
                    <span className="block text-xs text-slate-500">
                      {money(inv.total_amount)} · added {formatDate(inv.created_at)}
                    </span>
                    <PaidBar paidCents={toCents(inv.paid_amount)} totalCents={toCents(inv.total_amount)} className="mt-1.5 w-40" />
                  </span>
                  {/* The status, then what is left to pay */}
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <InvoiceStatusBadge status={inv.status} />
                    {inv.status !== InvoiceStatus.Paid && (
                      <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
                        {money(inv.balance)} <span className="font-medium text-slate-500">left</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {total > invoices.length && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 text-right">
              <Link href={PATHS.finances.list({ patient: patientId })} className="text-sm font-semibold text-primary hover:underline">
                See all {total} treatments
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** What is owed on a list of open treatments (exact). */
export const owedOn = (open: InvoiceSummary[]) => sumCents(open.map((i) => i.balance));
