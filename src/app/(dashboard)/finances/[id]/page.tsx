import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HiOutlineBanknotes } from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { formatDate, patientName } from "@/lib/patient-format";
import { formatTime } from "@/lib/time-zone";
import { formatMoney, toCents } from "@/lib/money";
import { BackLink } from "@/components/ui/back-link";
import { DeleteButton } from "@/components/ui/delete-button";
import { InvoiceStatusBadge, PaidBar } from "@/components/finances/invoice-status";
import { RecordPaymentForm } from "@/components/finances/record-payment-form";
import { recordPaymentAction } from "@/actions/record-payment";
import { removePaymentAction } from "@/actions/remove-payment";
import { deleteInvoiceAction } from "@/actions/delete-invoice";
import { PAYMENT_METHOD_LABELS, type InvoiceDetail, type PaymentMethod } from "@/types/invoices";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const NOTICES = {
  created: { tone: "border-emerald-200 bg-emerald-50 text-emerald-700", text: "Treatment saved." },
  payment_failed: { tone: "border-amber-200 bg-amber-50 text-amber-800", text: "The treatment was saved, but the payment was not. Record it below." },
};

/**
 * Server Component: Treatment
 *
 * One treatment (invoice): its cost, what is paid and what is left, the
 * payments (each with its date, method and the visit it was taken at), a
 * form to record money (all of the rest or any part), and removal of a
 * payment recorded by mistake. Buttons follow the "Finances" permissions.
 */
export default async function TreatmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; payment_failed?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [access, res] = await Promise.all([loadMyAccess(), serverApiFetch(API_PATHS.invoices.detail(id))]);
  const can = access?.grid.Finances;
  if (!can?.can_view) redirect(PATHS.finances.list());
  if (!res.ok) notFound();

  const { invoice }: { invoice: InvoiceDetail } = await res.json();
  // Without Reports there is no clinic-wide list: back and "after delete" go to the patient
  const canReports = !!access!.grid.Reports.can_view;
  const home = canReports ? PATHS.finances.list() : PATHS.patients.detail(invoice.patient_id);
  const currency = access!.clinic?.currency;
  const zone = access!.clinic?.timezone ?? "UTC";
  const money = (amount: string) => formatMoney(toCents(amount), currency);
  const balanceCents = toCents(invoice.balance);
  const title = invoice.title ?? "Treatment";
  const notice = query.payment_failed ? NOTICES.payment_failed : query.created ? NOTICES.created : undefined;

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink href={home}>{canReports ? "Back to finances" : "Back to patient"}</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight break-words">{title}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {invoice.patient ? (
              access!.grid.Patients.can_view ? (
                <Link href={PATHS.patients.detail(invoice.patient.id)} className="font-semibold text-primary hover:underline">
                  {patientName(invoice.patient)}
                </Link>
              ) : (
                patientName(invoice.patient)
              )
            ) : (
              "Unknown patient"
            )}
            {" · "}Added {formatDate(invoice.created_at, "long")}
            {invoice.due_date && ` · Due ${formatDate(invoice.due_date, "long")}`}
          </p>
        </div>
        {can.can_delete && (
          <DeleteButton
            size="md"
            action={deleteInvoiceAction.bind(null, invoice.id)}
            itemName={title}
            title={`Delete "${title}"?`}
            description="The treatment and its payments disappear from the app. They are kept in the records for audit."
            confirmLabel="Delete treatment"
            redirectTo={canReports ? PATHS.finances.list({ deleted: 1 }) : PATHS.patients.detail(invoice.patient_id)}
          />
        )}
      </div>

      {notice && (
        <div role="status" className={`rounded-md border px-4 py-3 text-sm font-medium ${notice.tone}`}>
          {notice.text}
        </div>
      )}

      {/* Total, paid, left */}
      <section className={`${card} p-6`}>
        <dl className="grid grid-cols-3 gap-4">
          {[
            ["Total cost", money(invoice.total_amount), "text-slate-800 dark:text-white"],
            ["Paid", money(invoice.paid_amount), "text-emerald-600 dark:text-emerald-400"],
            ["Left to pay", money(invoice.balance), balanceCents > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"],
          ].map(([label, value, tone]) => (
            <div key={label}>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className={`mt-1 text-xl sm:text-2xl font-black tabular-nums tracking-tight ${tone}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <PaidBar paidCents={toCents(invoice.paid_amount)} totalCents={toCents(invoice.total_amount)} className="mt-5" />
      </section>

      {/* Record money */}
      {can.can_create && balanceCents > 0 && (
        <section className={`${card} p-6`}>
          <h2 className="mb-4 font-bold text-slate-800 dark:text-white">Record a payment</h2>
          <RecordPaymentForm
            action={recordPaymentAction.bind(null, invoice.id, invoice.patient_id)}
            balance={invoice.balance}
            balanceLabel={money(invoice.balance)}
            currency={currency}
          />
        </section>
      )}

      {/* Payments */}
      <section className={card}>
        <h2 className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-white">
          <HiOutlineBanknotes aria-hidden="true" className="h-5 w-5 text-primary" />
          Payments
          {invoice.payments.length > 0 && <span className="text-sm font-semibold text-slate-400">{invoice.payments.length}</span>}
        </h2>
        {invoice.payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nothing paid yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold tabular-nums text-slate-800 dark:text-white">{money(payment.amount)}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {[
                      `${formatDate(payment.payment_date)} ${formatTime(payment.payment_date, zone)}`,
                      PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod],
                      payment.notes,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {payment.appointment_id && access!.grid.Appointments.can_view && (
                  <Link
                    href={PATHS.appointments.edit(payment.appointment_id)}
                    prefetch={false}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Taken at a visit
                  </Link>
                )}
                {can.can_delete && (
                  <DeleteButton
                    action={removePaymentAction.bind(null, invoice.id, payment.id)}
                    itemName={`payment of ${money(payment.amount)}`}
                    title={`Remove the payment of ${money(payment.amount)}?`}
                    description="Use this for a payment recorded by mistake. The balance goes back up. The payment is kept in the records for audit."
                    confirmLabel="Remove payment"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
