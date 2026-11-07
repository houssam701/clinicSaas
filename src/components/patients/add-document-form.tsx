"use client";

import React, { useActionState, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import type { DocumentFormField, DocumentFormState } from "@/lib/patient-form";
import { createPatientDocumentAction } from "@/actions/create-patient-document";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { DOCUMENT_TYPE_OPTIONS } from "@/types/patients";

const EMPTY: Record<DocumentFormField, string> = { name: "", file_url: "", document_type: "" };

/**
 * "Add document" button that opens a small form to attach a document link
 * (name, URL, type) to the patient. Closes after saving; reopening starts empty.
 */
export function AddDocumentForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState(EMPTY);
  const set =
    (field: DocumentFormField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const [state, formAction] = useActionState(
    async (prev: DocumentFormState, formData: FormData) => {
      const result = await createPatientDocumentAction(patientId, prev, formData);
      if (result.saved) {
        setOpen(false);
        setValues(EMPTY);
      }
      return result;
    },
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
      >
        <HiOutlinePlus aria-hidden="true" className="h-3.5 w-3.5" />
        Add document
      </button>
    );
  }

  const errors = state.saved ? {} : state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      noValidate
      className="w-full space-y-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
    >
      <FormAlert>{state.saved ? undefined : state.error}</FormAlert>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="doc-name" className={labelClass}>
            Name
          </label>
          <input
            id="doc-name"
            name="name"
            value={values.name}
            onChange={set("name")}
            placeholder="Blood test, March"
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? "doc-name-error" : undefined}
            className={inputClass(!!errors.name)}
          />
          <FieldError id="doc-name-error" messages={errors.name} />
        </div>
        <div>
          <label htmlFor="doc-type" className={labelClass}>
            Type <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <Select id="doc-type" name="document_type" value={values.document_type} onChange={set("document_type")} invalid={!!errors.document_type}>
            <option value="">No type</option>
            {DOCUMENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="doc-url" className={labelClass}>
          Link to the file
        </label>
        <input
          id="doc-url"
          name="file_url"
          value={values.file_url}
          onChange={set("file_url")}
          type="url"
          placeholder="https://..."
          aria-invalid={!!errors.file_url || undefined}
          aria-describedby={errors.file_url ? "doc-url-error" : undefined}
          className={inputClass(!!errors.file_url)}
        />
        <FieldError id="doc-url-error" messages={errors.file_url} />
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <SubmitButton label="Add document" pendingLabel="Adding..." />
      </div>
    </form>
  );
}
