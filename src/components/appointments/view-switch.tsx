"use client";

import Link from "next/link";
import { HiOutlineCalendarDays, HiOutlineListBullet } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { VIEW_COOKIE, type AppointmentsView } from "@/config/appointments-view";

/** Remembers the chosen view for next time (read by the appointments page). */
function rememberView(view: AppointmentsView) {
  document.cookie = `${VIEW_COOKIE}=${view}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

const OPTIONS: { view: AppointmentsView; label: string; icon: typeof HiOutlineListBullet }[] = [
  { view: "calendar", label: "Calendar", icon: HiOutlineCalendarDays },
  { view: "list", label: "List", icon: HiOutlineListBullet },
];

/**
 * Calendar | List switch. Both views show the same appointments for the same
 * period and filters; choosing one also remembers it for next time.
 */
export function ViewSwitch({ current, hrefFor }: { current: AppointmentsView; hrefFor: Record<AppointmentsView, string> }) {
  return (
    <nav aria-label="Appointments view" className="inline-flex rounded-md bg-slate-200/70 dark:bg-slate-800 p-1">
      {OPTIONS.map(({ view, label, icon: Icon }) => {
        const active = view === current;
        return (
          <Link
            key={view}
            href={hrefFor[view]}
            onClick={() => rememberView(view)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
