"use client";

import React, { useActionState, useState } from "react";
import type { DocumentFormField, DocumentFormState } from "@/lib/patient-form";
import { createPatientDocumentAction } from "@/actions/create-patient-document";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { DOCUMENT_TYPE_OPTIONS } from "@/types/patients";

const EMPTY: Record<DocumentFormField, string> = { name: "", file_url: "", document_type: "" };

export interface LinkDocumentFormProps {
  patientId: string;
  /** Called after the document is saved */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Saves a link to a file hosted elsewhere (e.g. a lab's portal) as a document.
 * The "Paste link" tab of AddDocumentPanel.
 */
export function LinkDocumentForm({ patientId, onDone, onCancel }: LinkDocumentFormProps) {
  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState(EMPTY);
  const set =
    (field: DocumentFormField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const [state, formAction] = useActionState(
    async (prev: DocumentFormState, formData: FormData) => {
      const result = await createPatientDocumentAction(patientId, prev, formData);
      if (result.saved) onDone();
      return result;
    },
    {}
  );

  const errors = state.saved ? {} : state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormAlert>{state.saved ? undefined : state.error}</FormAlert>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="link-name" className={labelClass}>
            Name
          </label>
          <input
            id="link-name"
            name="name"
            value={values.name}
            onChange={set("name")}
            placeholder="Blood test, March"
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? "link-name-error" : undefined}
            className={inputClass(!!errors.name)}
          />
          <FieldError id="link-name-error" messages={errors.name} />
        </div>
        <div>
          <label htmlFor="link-type" className={labelClass}>
            Type <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <Select id="link-type" name="document_type" value={values.document_type} onChange={set("document_type")}>
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
        <label htmlFor="link-url" className={labelClass}>
          Link to the file
        </label>
        <input
          id="link-url"
          name="file_url"
          type="url"
          value={values.file_url}
          onChange={set("file_url")}
          placeholder="https://..."
          aria-invalid={!!errors.file_url || undefined}
          aria-describedby={errors.file_url ? "link-url-error" : "link-url-hint"}
          className={inputClass(!!errors.file_url)}
        />
        {errors.file_url ? (
          <FieldError id="link-url-error" messages={errors.file_url} />
        ) : (
          <p id="link-url-hint" className="mt-1.5 text-xs text-slate-500">
            For files already online, such as a lab portal or a shared drive.
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <SubmitButton label="Save link" pendingLabel="Saving..." />
      </div>
    </form>
  );
}
