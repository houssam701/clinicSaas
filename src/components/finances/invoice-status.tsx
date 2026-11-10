import { InvoiceStatus } from "@/types/invoices";
import { cn } from "@/lib/utils";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Unpaid]: "Unpaid",
  [InvoiceStatus.Partial]: "Partly paid",
  [InvoiceStatus.Paid]: "Paid",
};

const BADGE: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Unpaid]: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  [InvoiceStatus.Partial]: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  [InvoiceStatus.Paid]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
};

/** The status of a treatment as a colored badge. */
export function InvoiceStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as InvoiceStatus;
  return (
    <span className={cn("inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-bold", BADGE[s], className)}>
      {INVOICE_STATUS_LABELS[s] ?? status}
    </span>
  );
}

/** How much of the total is paid, as a thin bar (amounts in cents). */
export function PaidBar({ paidCents, totalCents, className }: { paidCents: number; totalCents: number; className?: string }) {
  const pct = totalCents > 0 ? Math.min(100, Math.round((paidCents / totalCents) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Paid so far"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", className)}
    >
      <div
        className={cn("h-full origin-left rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-primary")}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
