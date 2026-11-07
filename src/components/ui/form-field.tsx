"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Classes for a text input or textarea; red when the field has an error. */
export const inputClass = (hasError: boolean, className?: string) =>
  cn(
    "block w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-md text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm sm:text-base",
    hasError ? "border-red-400 focus:ring-red-200" : "border-slate-200 dark:border-slate-700",
    className
  );

export const labelClass = "block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2";

/** First API error for a field, linked to it with aria-describedby={id}. */
export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-500 font-medium">
      {messages[0]}
    </p>
  );
}

/** General form error banner. */
export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {children}
    </div>
  );
}

/** Submit button that shows a spinner while its <form> is submitting. */
export function SubmitButton({
  label,
  pendingLabel,
  size = "md",
}: {
  label: string;
  pendingLabel: string;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size={size} isLoading={pending} loadingText={pendingLabel} aria-disabled={pending}>
      {label}
    </Button>
  );
}
