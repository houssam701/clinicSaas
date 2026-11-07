"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import type { PatientFormField, PatientFormState } from "@/lib/patient-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { GENDER_OPTIONS } from "@/types/patients";

export type PatientFormValues = Record<PatientFormField, string>;

type PatientFormMode = "create" | "edit";

// Everything that differs between creating and editing lives here
const MODE_COPY: Record<PatientFormMode, { submit: string; pending: string }> = {
  create: { submit: "Add patient", pending: "Adding..." },
  edit: { submit: "Save changes", pending: "Saving..." },
};

const EMPTY_VALUES: PatientFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
};

type TextField = {
  name: Exclude<PatientFormField, "gender">;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  optional?: boolean;
};

const NAME_FIELDS: TextField[] = [
  { name: "first_name", label: "First name", autoComplete: "off", placeholder: "Sara" },
  { name: "last_name", label: "Last name", autoComplete: "off", placeholder: "Haddad" },
];

const CONTACT_FIELDS: TextField[] = [
  { name: "email", label: "Email", type: "email", autoComplete: "off", placeholder: "sara@example.com", optional: true },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "off", placeholder: "+961 70 123 456", optional: true },
];

const initialState: PatientFormState = {};

export interface PatientFormProps {
  mode: PatientFormMode;
  /** Server action to submit to — the form does not know which API it calls */
  action: (state: PatientFormState, formData: FormData) => Promise<PatientFormState>;
  /** Where Cancel goes, from PATHS */
  cancelHref: string;
  initialValues?: PatientFormValues;
}

/**
 * Shared create/edit form for a patient's shared details (the same for every
 * clinic type). The caller injects the server action.
 */
export function PatientForm({ mode, action, cancelHref, initialValues = EMPTY_VALUES }: PatientFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const copy = MODE_COPY[mode];

  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState(initialValues);
  const set =
    (field: PatientFormField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const errors = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const renderText = (field: TextField) => (
    <div key={field.name}>
      <label htmlFor={field.name} className={labelClass}>
        {field.label}
        {field.optional && <span className="ml-1 font-medium text-slate-400">(optional)</span>}
      </label>
      <input
        id={field.name}
        name={field.name}
        type={field.type ?? "text"}
        autoComplete={field.autoComplete}
        value={values[field.name]}
        onChange={set(field.name)}
        aria-invalid={!!errors[field.name] || undefined}
        aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
        className={inputClass(!!errors[field.name])}
        placeholder={field.placeholder}
      />
      <FieldError id={`${field.name}-error`} messages={errors[field.name]} />
    </div>
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormAlert>{state.error}</FormAlert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{NAME_FIELDS.map(renderText)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{CONTACT_FIELDS.map(renderText)}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date_of_birth" className={labelClass}>
            Date of birth <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            max={today}
            value={values.date_of_birth}
            onChange={set("date_of_birth")}
            aria-invalid={!!errors.date_of_birth || undefined}
            aria-describedby={errors.date_of_birth ? "date_of_birth-error" : undefined}
            className={inputClass(!!errors.date_of_birth)}
          />
          <FieldError id="date_of_birth-error" messages={errors.date_of_birth} />
        </div>
        <div>
          <label htmlFor="gender" className={labelClass}>
            Gender <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <Select
            id="gender"
            name="gender"
            value={values.gender}
            onChange={set("gender")}
            invalid={!!errors.gender}
            aria-describedby={errors.gender ? "gender-error" : undefined}
          >
            <option value="">Not specified</option>
            {/* Keep a saved value that is no longer in the list */}
            {values.gender && !(GENDER_OPTIONS as readonly string[]).includes(values.gender) && (
              <option value={values.gender}>{values.gender}</option>
            )}
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <FieldError id="gender-error" messages={errors.gender} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={cancelHref}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </Link>
        <SubmitButton label={copy.submit} pendingLabel={copy.pending} />
      </div>
    </form>
  );
}
