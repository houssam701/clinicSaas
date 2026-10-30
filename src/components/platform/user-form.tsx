"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { UserFormState } from "@/lib/user-form";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/users";
import { PATHS } from "@/config/path";

export interface ClinicOption {
  id: string;
  name: string;
}

export interface UserFormValues {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  clinic_id: string;
}

type UserFormMode = "create" | "edit";

// Everything that differs between creating and editing lives here
const MODE_COPY: Record<
  UserFormMode,
  { submit: string; pending: string; passwordLabel: string; passwordHint: string }
> = {
  create: {
    submit: "Create user",
    pending: "Creating...",
    passwordLabel: "Temporary password",
    passwordHint: "At least 8 characters. Share it with the user so they can sign in.",
  },
  edit: {
    submit: "Save changes",
    pending: "Saving...",
    passwordLabel: "New password",
    passwordHint: "Leave blank to keep the current password.",
  },
};

const EMPTY_VALUES: UserFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  role: UserRole.Admin,
  clinic_id: "",
};

// SuperAdmin is not offered: the platform has exactly one, and it already exists.
const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: UserRole.Admin, label: "Admin", hint: "Manages one clinic and its staff" },
  { value: UserRole.Staff, label: "Staff", hint: "Works inside one clinic" },
];

const inputClass = (hasError: boolean) =>
  `block w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-md text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm sm:text-base ${
    hasError ? "border-red-400 focus:ring-red-200" : "border-slate-200 dark:border-slate-700"
  }`;

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-500 font-medium">
      {messages[0]}
    </p>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="md"
      isLoading={pending}
      loadingText={pendingLabel}
      aria-disabled={pending}
    >
      {label}
    </Button>
  );
}

const initialState: UserFormState = {};

export interface UserFormProps {
  mode: UserFormMode;
  /** Server action to submit to — the form does not know which API it calls */
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  clinics: ClinicOption[];
  initialValues?: UserFormValues;
}

/**
 * Shared create/edit form for platform users.
 * The caller injects the server action, so the same UI serves both flows.
 */
export function UserForm({ mode, action, clinics, initialValues = EMPTY_VALUES }: UserFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const copy = MODE_COPY[mode];

  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState({ ...initialValues, password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const set =
    (field: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          {state.error}
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            First name
          </label>
          <input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            value={values.first_name}
            onChange={set("first_name")}
            aria-describedby={errors.first_name ? "first_name-error" : undefined}
            className={inputClass(!!errors.first_name)}
            placeholder="Amira"
          />
          <FieldError id="first_name-error" messages={errors.first_name} />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Last name
          </label>
          <input
            id="last_name"
            name="last_name"
            autoComplete="family-name"
            value={values.last_name}
            onChange={set("last_name")}
            aria-describedby={errors.last_name ? "last_name-error" : undefined}
            className={inputClass(!!errors.last_name)}
            placeholder="Hassan"
          />
          <FieldError id="last_name-error" messages={errors.last_name} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          value={values.email}
          onChange={set("email")}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={inputClass(!!errors.email)}
          placeholder="amira@clinic.com"
        />
        <FieldError id="email-error" messages={errors.email} />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          {copy.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            aria-describedby={errors.password ? "password-error" : "password-hint"}
            className={`${inputClass(!!errors.password)} pr-20`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password ? (
          <FieldError id="password-error" messages={errors.password} />
        ) : (
          <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
            {copy.passwordHint}
          </p>
        )}
      </div>

      {/* Role */}
      <fieldset>
        <legend className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Role</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((option) => {
            const checked = values.role === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md border p-4 transition-all ${
                  checked
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={checked}
                  onChange={set("role")}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
              </label>
            );
          })}
        </div>
        <FieldError id="role-error" messages={errors.role} />
      </fieldset>

      {/* Clinic — Admin and Staff always belong to one */}
      <div>
          <label htmlFor="clinic_id" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Clinic
          </label>
          {clinics.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No clinics exist yet. Create a clinic first, then assign users to it.
            </p>
          ) : (
            <select
              id="clinic_id"
              name="clinic_id"
              value={values.clinic_id}
              onChange={set("clinic_id")}
              aria-describedby={errors.clinic_id ? "clinic_id-error" : undefined}
              className={inputClass(!!errors.clinic_id)}
            >
              <option value="">Select a clinic…</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          )}
          <FieldError id="clinic_id-error" messages={errors.clinic_id} />
        </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={PATHS.platform.users.list()}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </Link>
        <SubmitButton label={copy.submit} pendingLabel={copy.pending} />
      </div>
    </form>
  );
}
