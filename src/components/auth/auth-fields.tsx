"use client";

import type { ComponentProps } from "react";
import type { IconType } from "react-icons";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A labelled input with a leading icon, as on the sign-in page. */
export function AuthField({
  id,
  label,
  icon: Icon,
  error,
  hint,
  ...input
}: { id: string; label: string; icon: IconType; error?: string; hint?: string } & ComponentProps<"input">) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <input
          id={id}
          name={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm sm:text-base",
            error ? "border-red-400 focus:ring-red-200" : "border-slate-200"
          )}
          {...input}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-500 font-medium">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Full-width submit button with a spinner while its form is sending. */
export function AuthSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" fullWidth isLoading={pending} loadingText={pendingLabel} aria-disabled={pending}>
      {label}
    </Button>
  );
}
