import { HiOutlineCalendarDays } from "react-icons/hi2";

/**
 * Clinic dashboard.
 *
 * Appointments, patients and revenue are not connected yet, so this shows an
 * honest empty state instead of sample numbers that could be mistaken for real
 * clinic data. Action buttons come back once the features behind them exist.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8 bg-bgColor dark:bg-slate-950 min-h-full transition-colors">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Clinic Overview
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Your clinic&apos;s appointments and patients at a glance.
        </p>
      </div>

      <div className="rounded-md bg-slate-200/50 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-800/80 px-6 py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
          <HiOutlineCalendarDays aria-hidden="true" className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-white">
          No appointments yet
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Today&apos;s appointments, patients and revenue will show here once they are added.
        </p>
      </div>
    </div>
  );
}
