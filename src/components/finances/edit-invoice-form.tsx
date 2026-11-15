"use client";

import React, { useActionState, useState } from "react";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import type { InvoiceFormState } from "@/lib/finance-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";

export interface EditInvoiceFormProps {
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  initial: { title: string; total_amount: string; due_date: string };
  /** What is already paid (formatted), so the limit on the total is visible */
  paidLabel: string;
  currency?: string;
}

/**
 * "Edit" on a treatment page: opens a form for the title, total and due
 * date, and closes again after saving. The total cannot go below what is paid.
 */
export function EditInvoiceForm({ action, initial, paidLabel, currency }: EditInvoiceFormProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(initial);
  const [state, formAction] = useActionState(async (prev: InvoiceFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.saved) setEditing(false);
    return result;
  }, {});
  const set =
    (field: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValues(initial);
          setEditing(true);
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
      >
        <HiOutlinePencilSquare aria-hidden="true" className="h-4 w-4" />
        Edit
      </button>
    );
  }

  const errors = state.saved ? {} : state.fieldErrors ?? {};
  const unit = currency ? <span className="ml-1 font-medium text-slate-400">({currency})</span> : null;

  return (
    <form
      action={formAction}
      noValidate
      className="w-full space-y-4 rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6"
    >
      <h2 className="font-bold text-slate-800 dark:text-white">Edit treatment</h2>
      <FormAlert>{state.saved ? undefined : state.error}</FormAlert>
      <div>
        <label htmlFor="edit-title" className={labelClass}>
          Treatment
        </label>
        <input id="edit-title" name="title" value={values.title} onChange={set("title")} aria-invalid={!!errors.title || undefined} className={inputClass(!!errors.title)} />
        <FieldError id="edit-title-error" messages={errors.title} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-total" className={labelClass}>
            Total cost{unit}
          </label>
          <input
            id="edit-total"
            name="total_amount"
            inputMode="decimal"
            autoComplete="off"
            value={values.total_amount}
            onChange={set("total_amount")}
            aria-invalid={!!errors.total_amount || undefined}
            aria-describedby={errors.total_amount ? "edit-total-error" : "edit-total-hint"}
            className={inputClass(!!errors.total_amount, "tabular-nums")}
          />
          {errors.total_amount ? (
            <FieldError id="edit-total-error" messages={errors.total_amount} />
          ) : (
            <p id="edit-total-hint" className="mt-1.5 text-xs text-slate-500">
              At least what is already paid ({paidLabel}).
            </p>
          )}
        </div>
        <div>
          <label htmlFor="edit-due" className={labelClass}>
            Due date <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <input id="edit-due" name="due_date" type="date" value={values.due_date} onChange={set("due_date")} aria-invalid={!!errors.due_date || undefined} className={inputClass(!!errors.due_date)} />
          <FieldError id="edit-due-error" messages={errors.due_date} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>
        <SubmitButton label="Save changes" pendingLabel="Saving..." />
      </div>
    </form>
  );
}
