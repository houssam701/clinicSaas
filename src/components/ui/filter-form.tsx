"use client";

import { useState, type ReactNode } from "react";
import Form from "next/form";
import { cn } from "@/lib/utils";

export interface FilterFormProps {
  /** List page to navigate to, from PATHS */
  action: string;
  /** Name of the input or select that must be filled before submitting */
  field: string;
  /** Its value when the page loaded (from the URL) */
  initialValue?: string;
  submitLabel: string;
  /** The fields (hidden inputs, the search input or select) */
  children: ReactNode;
  /** Rendered after the submit button, e.g. a Reset link */
  trailing?: ReactNode;
  className?: string;
}

/**
 * next/form filter bar whose submit button stays disabled, and Enter does
 * nothing, while `field` is empty. Clearing a filter is the Reset link's job.
 */
export function FilterForm({
  action,
  field,
  initialValue = "",
  submitLabel,
  children,
  trailing,
  className,
}: FilterFormProps) {
  const [isEmpty, setIsEmpty] = useState(!initialValue.trim());

  const readField = (form: HTMLFormElement) => {
    const el = form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement | null;
    return el?.value.trim() ?? "";
  };

  return (
    <Form
      action={action}
      className={cn("flex items-center gap-2", className)}
      onChange={(e) => setIsEmpty(!readField(e.currentTarget))}
      onSubmit={(e) => {
        if (!readField(e.currentTarget)) e.preventDefault();
      }}
    >
      {children}
      <button
        type="submit"
        disabled={isEmpty}
        className="h-9 shrink-0 px-3 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-slate-900"
      >
        {submitLabel}
      </button>
      {trailing}
    </Form>
  );
}
