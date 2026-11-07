"use client";

import { useRouter } from "next/navigation";
import { HiOutlineCalendar } from "react-icons/hi2";
import { PATHS } from "@/config/path";

/** "Go to date" picker: opens the chosen day in the current view and filters. */
export function DateJump({ date, keep }: { date: string; keep: Record<string, string | undefined> }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex h-9 items-center">
      <span className="sr-only">Go to date</span>
      <HiOutlineCalendar aria-hidden="true" className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" />
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && router.push(PATHS.appointments.list({ ...keep, date: e.target.value }))}
        className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
      />
    </label>
  );
}
