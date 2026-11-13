import type { ReactNode } from "react";
import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi2";
import { cn } from "@/lib/utils";

export interface BackLinkProps {
  /** Destination, from PATHS */
  href: string;
  /** Visible text, e.g. "Back to users" */
  children: ReactNode;
  className?: string;
}

/** "← Back to …" link at the top of detail and form pages. */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors",
        "hover:bg-slate-200/60 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        className
      )}
    >
      <HiArrowLeft
        aria-hidden="true"
        className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
      />
      {children}
    </Link>
  );
}
