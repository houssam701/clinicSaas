"use client";

import React, { useActionState, useState } from "react";
import { HiOutlineHeart, HiOutlinePencilSquare } from "react-icons/hi2";
import type { MedicalHistoryFormField, MedicalHistoryFormState } from "@/lib/patient-form";
import { updateMedicalHistoryAction } from "@/actions/update-medical-history";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { BLOOD_TYPE_OPTIONS } from "@/types/patients";

export type MedicalHistoryValues = Record<MedicalHistoryFormField, string>;

const FIELDS: { name: MedicalHistoryFormField; label: string; placeholder?: string }[] = [
  { name: "blood_type", label: "Blood type" },
  { name: "allergies", label: "Allergies", placeholder: "e.g. Penicillin, latex" },
  { name: "chronic_conditions", label: "Chronic conditions", placeholder: "e.g. Diabetes type 2, asthma" },
  { name: "current_medications", label: "Current medications", placeholder: "e.g. Metformin 500 mg twice a day" },
];

const EMPTY: MedicalHistoryValues = {
  blood_type: "",
  allergies: "",
  chronic_conditions: "",
  current_medications: "",
};

export interface MedicalHistoryCardProps {
  patientId: string;
  /** null when nothing has been recorded yet */
  history: MedicalHistoryValues | null;
  /** Formatted "last updated" date, when there is a record */
  lastUpdated?: string;
  canEdit: boolean;
}

/**
 * The patient's shared medical history: read-only, with an Edit button for
 * users with can_edit on "Patients". Saving replaces the whole record.
 */
export function MedicalHistoryCard({ patientId, history, lastUpdated, canEdit }: MedicalHistoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(history ?? EMPTY);

  const [state, formAction] = useActionState(
    async (prev: MedicalHistoryFormState, formData: FormData) => {
      const result = await updateMedicalHistoryAction(patientId, prev, formData);
      if (result.saved) setEditing(false);
      return result;
    },
    {}
  );

  const set =
    (field: MedicalHistoryFormField) =>
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const startEditing = () => {
    setValues(history ?? EMPTY);
    setEditing(true);
  };

  const errors = editing && !state.saved ? state.fieldErrors ?? {} : {};
  const formError = editing && !state.saved ? state.error : undefined;

  return (
    <section className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <HiOutlineHeart aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-500" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 dark:text-white">Medical history</h2>
            {lastUpdated && <p className="text-xs text-slate-500 dark:text-slate-400">Last updated {lastUpdated}</p>}
          </div>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
          >
            <HiOutlinePencilSquare aria-hidden="true" className="h-3.5 w-3.5" />
            {history ? "Edit" : "Add"}
          </button>
        )}
      </header>

      {editing ? (
        <form action={formAction} className="space-y-5 p-6" noValidate>
          <FormAlert>{formError}</FormAlert>
          {FIELDS.map((field) => (
            <div key={field.name}>
              <label htmlFor={`mh-${field.name}`} className={labelClass}>
                {field.label}
              </label>
              {field.name === "blood_type" ? (
                <Select
                  id={`mh-${field.name}`}
                  name={field.name}
                  value={values.blood_type}
                  onChange={set("blood_type")}
                  invalid={!!errors.blood_type}
                  wrapperClassName="sm:max-w-xs"
                >
                  <option value="">Unknown</option>
                  {/* Keep a saved value that is not in the list */}
                  {values.blood_type && !(BLOOD_TYPE_OPTIONS as readonly string[]).includes(values.blood_type) && (
                    <option value={values.blood_type}>{values.blood_type}</option>
                  )}
                  {BLOOD_TYPE_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              ) : (
                <textarea
                  id={`mh-${field.name}`}
                  name={field.name}
                  rows={2}
                  value={values[field.name]}
                  onChange={set(field.name)}
                  placeholder={field.placeholder}
                  aria-invalid={!!errors[field.name] || undefined}
                  aria-describedby={errors[field.name] ? `mh-${field.name}-error` : undefined}
                  className={inputClass(!!errors[field.name], "resize-y")}
                />
              )}
              <FieldError id={`mh-${field.name}-error`} messages={errors[field.name]} />
            </div>
          ))}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <SubmitButton label="Save medical history" pendingLabel="Saving..." />
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          {FIELDS.map((field) => {
            const value = history?.[field.name];
            return (
              <div
                key={field.name}
                className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
              >
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{field.label}</dt>
                <dd
                  className={`mt-1 whitespace-pre-line break-words text-sm ${
                    value ? "font-medium text-slate-800 dark:text-white" : "text-slate-400"
                  }`}
                >
                  {value || "Not recorded"}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
