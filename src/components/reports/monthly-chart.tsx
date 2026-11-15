import { formatMonth } from "@/lib/report-range";
import { cn } from "@/lib/utils";

export interface MonthlyChartProps {
  months: { month: string; cents: number; label: string }[];
  /** Months inside the chosen period ("2026-11"), drawn solid; the others are lighter */
  inPeriod: Set<string>;
}

/**
 * Money received per month: one bar per month, no client JS. Hovering or
 * focusing a bar shows its amount; the same figures are in a table for
 * screen readers. Bars start at zero, with a 2px gap and rounded tops.
 */
export function MonthlyChart({ months, inPeriod }: MonthlyChartProps) {
  const max = Math.max(...months.map((m) => m.cents), 1);

  return (
    <figure>
      <div className="relative h-48" aria-hidden="true">
        {/* Recessive guides at the top, middle and baseline */}
        {[0, 50, 100].map((pct) => (
          <div
            key={pct}
            className={cn("absolute inset-x-0 border-t", pct === 100 ? "border-slate-300 dark:border-slate-700" : "border-dashed border-slate-200 dark:border-slate-800")}
            style={{ top: `${pct}%` }}
          />
        ))}
        <div className="relative flex h-full items-end gap-0.5 sm:gap-1.5">
          {months.map((m) => {
            const solid = inPeriod.has(m.month);
            return (
              <div key={m.month} tabIndex={0} className="group relative flex h-full flex-1 items-end focus:outline-none">
                <div
                  className={cn(
                    "w-full rounded-t transition-colors",
                    m.cents > 0 ? "min-h-1" : "",
                    solid ? "bg-primary group-hover:bg-blue-700" : "bg-primary/25 group-hover:bg-primary/40 dark:bg-primary/30",
                    "group-focus-visible:ring-4 group-focus-visible:ring-primary/20"
                  )}
                  style={{ height: `${(m.cents / max) * 100}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block dark:bg-slate-700">
                  <span className="block text-slate-300">{formatMonth(m.month, "long")}</span>
                  <span className="block font-bold tabular-nums">{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-0.5 sm:gap-1.5" aria-hidden="true">
        {months.map((m, i) => (
          <span
            key={m.month}
            className={cn(
              "flex-1 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400",
              // On phones, every other month to avoid crowding
              i % 2 === 1 && "max-sm:invisible"
            )}
          >
            {formatMonth(m.month)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Money received per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Received</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{formatMonth(m.month, "long")}</th>
              <td>{m.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
