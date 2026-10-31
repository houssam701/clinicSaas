import React from "react";
import { HiChevronUpDown } from "react-icons/hi2";
import { cn } from "@/lib/utils";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Red border and ring for a field with a validation error */
  invalid?: boolean;
  /** "sm" for toolbars and filters, "md" for form fields */
  size?: "sm" | "md";
  /** Classes for the wrapper, e.g. width */
  wrapperClassName?: string;
}

const sizes = {
  sm: { select: "h-9 pl-3 pr-9 text-sm", icon: "right-2.5 h-4 w-4" },
  md: { select: "py-3 pl-4 pr-11 text-sm sm:text-base", icon: "right-3.5 h-5 w-5" },
} as const;

/**
 * Native <select> with the browser arrow replaced by a react-icons chevron.
 * Stays a real <select>, so it works in Server Components, forms and on phones.
 */
export function Select({
  invalid = false,
  size = "md",
  className,
  wrapperClassName,
  children,
  ...props
}: SelectProps) {
  const s = sizes[size];
  return (
    <div className={cn("group relative", wrapperClassName)}>
      <select
        {...props}
        aria-invalid={invalid || undefined}
        className={cn(
          "block w-full appearance-none rounded-md border bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-white transition-all",
          "hover:border-primary/40 focus:outline-none focus:ring-4 focus:border-primary disabled:opacity-60",
          invalid
            ? "border-red-400 focus:ring-red-200"
            : "border-slate-200 dark:border-slate-700 focus:ring-primary/20",
          s.select,
          className
        )}
      >
        {children}
      </select>
      <HiChevronUpDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-primary group-focus-within:text-primary",
          s.icon
        )}
      />
    </div>
  );
}
