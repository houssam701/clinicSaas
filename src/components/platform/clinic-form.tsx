"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ClinicFormState } from "@/lib/clinic-form";
import { Button } from "@/components/ui/button";
import { ClinicType } from "@/types/clinics";
import { PATHS } from "@/config/path";

export interface ClinicFormValues {
  name: string;
  clinic_type: ClinicType;
}

type ClinicFormMode = "create" | "edit";

// Everything that differs between creating and editing lives here
const MODE_COPY: Record<ClinicFormMode, { submit: string; pending: string }> = {
  create: { submit: "Create clinic", pending: "Creating..." },
  edit: { submit: "Save changes", pending: "Saving..." },
};

const EMPTY_VALUES: ClinicFormValues = {
  name: "",
  clinic_type: ClinicType.Dentistry,
};

const TYPE_OPTIONS: { value: ClinicType; label: string; hint: string }[] = [
  { value: ClinicType.Dentistry, label: "Dentistry", hint: "Dental care, treatments and check-ups" },
  { value: ClinicType.Therapy, label: "Therapy", hint: "Physiotherapy and therapy sessions" },
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

const initialState: ClinicFormState = {};

export interface ClinicFormProps {
  mode: ClinicFormMode;
  /** Server action to submit to — the form does not know which API it calls */
  action: (state: ClinicFormState, formData: FormData) => Promise<ClinicFormState>;
  initialValues?: ClinicFormValues;
}

/**
 * Shared create/edit form for clinics.
 * The caller injects the server action, so the same UI serves both flows.
 */
export function ClinicForm({ mode, action, initialValues = EMPTY_VALUES }: ClinicFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const copy = MODE_COPY[mode];

  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState(initialValues);

  const set =
    (field: keyof ClinicFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
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
      <div>
        <label htmlFor="name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          Clinic name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="organization"
          value={values.name}
          onChange={set("name")}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={inputClass(!!errors.name)}
          placeholder="Smile Dental Center"
        />
        <FieldError id="name-error" messages={errors.name} />
      </div>

      {/* Type */}
      <fieldset>
        <legend className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Clinic type</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TYPE_OPTIONS.map((option) => {
            const checked = values.clinic_type === option.value;
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
                  name="clinic_type"
                  value={option.value}
                  checked={checked}
                  onChange={set("clinic_type")}
                  className="sr-only"
                />
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
              </label>
            );
          })}
        </div>
        <FieldError id="clinic_type-error" messages={errors.clinic_type} />
      </fieldset>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={PATHS.platform.clinics.list()}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </Link>
        <SubmitButton label={copy.submit} pendingLabel={copy.pending} />
      </div>
    </form>
  );
}
