import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One colour per meaning, the same everywhere a status is shown. */
export type BadgeTone = "gray" | "blue" | "green" | "amber" | "red";

const DOT: Record<BadgeTone, string> = {
  gray: "bg-slate-400 dark:bg-slate-500",
  blue: "bg-primary",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};

const TAG: Record<BadgeTone, string> = {
  gray: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  green: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  amber: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  red: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

export interface BadgeProps {
  tone?: BadgeTone;
  /**
   * "dot" (default): a 6px dot in the status colour and the label in the
   * text colour, no background. "tag": a pale tint with dark text of the
   * same hue, for the one thing on a row that needs attention.
   */
  variant?: "dot" | "tag";
  children: ReactNode;
  className?: string;
}

/**
 * A status. Calm by default (a coloured dot beside an ink label); a pale
 * tag only where something needs attention. Roles and types are not
 * statuses: show them as plain secondary text, not as a Badge.
 */
export function Badge({ tone = "gray", variant = "dot", children, className }: BadgeProps) {
  if (variant === "tag") {
    return (
      <span className={cn("inline-flex flex-none items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium", TAG[tone], className)}>
        {children}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex flex-none items-center gap-2 whitespace-nowrap text-[13px] font-medium text-slate-700 dark:text-slate-200", className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 flex-none rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}
