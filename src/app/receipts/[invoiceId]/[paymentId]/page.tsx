import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HiArrowLeft, HiCheckCircle } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { requirePageRole } from "@/services/page-guard";
import { patientName } from "@/lib/patient-format";
import { formatDay, formatTime, todayIn, zonedParts } from "@/lib/time-zone";
import { formatMoney, toCents } from "@/lib/money";
import { PrintButton } from "@/components/finances/print-button";
import { PAYMENT_METHOD_LABELS, type InvoiceDetail, type PaymentMethod } from "@/types/invoices";
import { UserRole } from "@/types/users";

export const metadata: Metadata = { title: "Payment receipt" };

/**
 * Server Component: Payment receipt
 *
 * A printable page for one payment, outside the dashboard (no sidebar or top
 * bar): the clinic, the amount received, who paid, for what and how, and
 * on which date. Data comes from GET /api/invoices/[id],
 * so it needs view access on "Finances". Prints on A4 without the toolbar.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ invoiceId: string; paymentId: string }> }) {
  await requirePageRole([UserRole.SuperAdmin, UserRole.Admin, UserRole.Staff]);
  const { invoiceId, paymentId } = await params;

  const [access, res] = await Promise.all([loadMyAccess(), serverApiFetch(API_PATHS.invoices.detail(invoiceId))]);
  if (!res.ok) notFound();
  const { invoice }: { invoice: InvoiceDetail } = await res.json();
  const payment = invoice.payments.find((p) => p.id === paymentId);
  if (!payment) notFound();

  const currency = access?.clinic?.currency;
  const zone = access?.clinic?.timezone ?? "UTC";
  const money = (cents: number) => formatMoney(cents, currency);

  const day = zonedParts(new Date(payment.payment_date), zone).date;
  const receiptNo = payment.id.slice(0, 8).toUpperCase();

  const details: [string, string][] = [
    ["Received from", invoice.patient ? patientName(invoice.patient) : "Patient"],
    ["For", invoice.title ?? "Treatment"],
    ["Paid by", PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method],
    ["Date", `${formatDay(day, "long")}, ${formatTime(payment.payment_date, zone)}`],
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-800 print:min-h-0 print:bg-white print:p-0">
      {/* A4 with comfortable margins when printed */}
      <style>{`@page { size: A4; margin: 18mm; }`}</style>

      <div className="mx-auto max-w-2xl">
        {/* Toolbar (screen only) */}
        <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link
            href={PATHS.finances.detail(invoiceId)}
            className="group inline-flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
          >
            <HiArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to the treatment
          </Link>
          <PrintButton />
        </div>

        <article className="overflow-hidden rounded-lg bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
          {/* Clinic and receipt number */}
          <header className="flex items-start justify-between gap-6 bg-slate-900 px-8 py-7 text-white sm:px-10 print:bg-white print:px-0 print:text-slate-900">
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold tracking-tight">{access?.clinic?.name ?? "Clinic"}</p>
              <p className="mt-1 text-sm text-slate-300 print:text-slate-500">Payment receipt</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-400 print:text-slate-500">Receipt no.</p>
              <p className="mt-0.5 text-base font-bold tracking-wide tabular-nums">{receiptNo}</p>
            </div>
          </header>

          <div className="px-8 py-8 sm:px-10 print:px-0">
            {/* The moment: what was received */}
            <div className="border-b border-slate-200 pb-8">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <HiCheckCircle aria-hidden="true" className="h-5 w-5" />
                Payment received
              </p>
              <p className="mt-2 text-5xl font-black tracking-tight tabular-nums">{money(toCents(payment.amount))}</p>
            </div>

            {/* Who, what, how */}
            <dl className="grid grid-cols-1 gap-x-10 gap-y-5 py-8 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-base font-semibold">{value}</dd>
                </div>
              ))}
              {payment.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Note</dt>
                  <dd className="mt-1 break-words text-base">{payment.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <footer className="flex flex-col gap-1 border-t border-slate-200 px-8 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-10 print:px-0">
            <span>Thank you.</span>
            <span>
              Issued by {access?.clinic?.name ?? "the clinic"} on {formatDay(todayIn(zone), "long")}
            </span>
          </footer>
        </article>
      </div>
    </main>
  );
}
