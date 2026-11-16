"use client";

import React, { useActionState, useState } from "react";
import { HiOutlineEye, HiOutlineEyeSlash, HiOutlineKey } from "react-icons/hi2";
import type { PasswordFormField, PasswordFormState } from "@/lib/password-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";

const EMPTY: Record<PasswordFormField, string> = { current_password: "", new_password: "", confirm_password: "" };

const FIELDS: { name: PasswordFormField; label: string; autoComplete: string; hint?: string }[] = [
  { name: "current_password", label: "Current password", autoComplete: "current-password" },
  { name: "new_password", label: "New password", autoComplete: "new-password", hint: "At least 8 characters." },
  { name: "confirm_password", label: "Confirm new password", autoComplete: "new-password" },
];

const secondaryButton =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

export interface ChangePasswordFormProps {
  /** changePasswordAction bound to this Account page; on success it redirects back with a notice */
  action: (state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
}

/**
 * "Change password" on the Account page: asks for the current password and
 * the new one twice. Afterwards the user stays signed in here, and every
 * other device is signed out.
 */
export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [state, formAction] = useActionState(action, {});

  const set = (field: PasswordFormField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: e.target.value }));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondaryButton}>
        <HiOutlineKey aria-hidden="true" className="h-4 w-4" />
        Change password
      </button>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="max-w-md space-y-4">
      <FormAlert>{state.error}</FormAlert>
      {FIELDS.map(({ name, label, autoComplete, hint }) => (
        <div key={name}>
          <label htmlFor={name} className={labelClass}>
            {label}
          </label>
          <input
            id={name}
            name={name}
            type={show ? "text" : "password"}
            autoComplete={autoComplete}
            value={values[name]}
            onChange={set(name)}
            required
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
            className={inputClass(!!errors[name])}
          />
          {errors[name] ? (
            <FieldError id={`${name}-error`} messages={errors[name]} />
          ) : (
            hint && (
              <p id={`${name}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {hint}
              </p>
            )
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-300"
      >
        {show ? <HiOutlineEyeSlash aria-hidden="true" className="h-4 w-4" /> : <HiOutlineEye aria-hidden="true" className="h-4 w-4" />}
        {show ? "Hide passwords" : "Show passwords"}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400">Your other devices will be signed out.</p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton label="Change password" pendingLabel="Changing..." />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValues(EMPTY);
          }}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
