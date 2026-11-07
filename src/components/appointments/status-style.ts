import { AppointmentStatus } from "@/types/appointments";

/** One look per status, shared by the calendar blocks, list badges and legend. */
export const STATUS_STYLE: Record<AppointmentStatus, { block: string; badge: string; dot: string }> = {
  [AppointmentStatus.Scheduled]: {
    block: "border-l-primary bg-blue-50 text-slate-800 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-50 dark:hover:bg-blue-950",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    dot: "bg-primary",
  },
  [AppointmentStatus.Completed]: {
    block: "border-l-emerald-500 bg-emerald-50 text-slate-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-50 dark:hover:bg-emerald-950",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  [AppointmentStatus.Canceled]: {
    block: "border-l-slate-400 bg-slate-100 text-slate-500 line-through decoration-slate-400/70 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  [AppointmentStatus.NoShow]: {
    block: "border-l-amber-500 bg-amber-50 text-slate-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};
