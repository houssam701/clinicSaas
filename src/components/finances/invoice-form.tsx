"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import type { InvoiceFormState } from "@/lib/finance-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { PatientPicker } from "@/components/appointments/patient-picker";
import { PAYMENT_METHOD_LABELS, PaymentMethod } from "@/types/invoices";
import { cn } from "@/lib/utils";

type PaidNow = "nothing" | "all" | "part";

const PAID_NOW_OPTIONS: { value: PaidNow; label: string; hint: string }[] = [
  { value: "nothing", label: "Nothing yet", hint: "Payments are recorded later" },
  { value: "all", label: "All of it", hint: "Paid in full now" },
  { value: "part", label: "Part of it", hint: "A first payment now" },
];

export interface InvoiceFormProps {
  action: (state: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  /** Prefilled patient (from their page or an appointment) */
  patient: { id: string; name: string } | null;
  /** The appointment this treatment comes from, if any */
  appointmentId?: string;
  /** The clinic's currency code, shown next to amounts */
  currency?: string;
  cancelHref: string;
}

/**
 * New treatment: who, what, and the full cost, plus what was paid right away
 * (nothing, all of it, or a first part). Later payments go on the treatment page.
 */
export function InvoiceForm({ action, patient, appointmentId, currency, cancelHref }: InvoiceFormProps) {
  const [state, formAction] = useActionState(action, {});
  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState({ title: "", total_amount: "", due_date: "", part: "", payment_method: PaymentMethod.Cash as string });
  const [paidNow, setPaidNow] = useState<PaidNow>("nothing");
  const set =
    (field: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const errors = state.fieldErrors ?? {};
  const paidValue = paidNow === "all" ? values.total_amount : paidNow === "part" ? values.part : "";
  const unit = currency ? <span className="ml-1 font-medium text-slate-400">({currency})</span> : null;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormAlert>{state.error}</FormAlert>
      {appointmentId && <input type="hidden" name="appointment_id" value={appointmentId} />}
      <input type="hidden" name="paid_now" value={paidValue} />

      <div>
        <p className={labelClass}>Patient</p>
        <PatientPicker name="patient_id" initial={patient} invalid={!!errors.patient_id} describedBy={errors.patient_id ? "patient-error" : undefined} />
        <FieldError id="patient-error" messages={errors.patient_id} />
      </div>

      <div>
        <label htmlFor="title" className={labelClass}>
          Treatment
        </label>
        <input
          id="title"
          name="title"
          value={values.title}
          onChange={set("title")}
          placeholder="What is charged"
          aria-invalid={!!errors.title || undefined}
          aria-describedby={errors.title ? "title-error" : undefined}
          className={inputClass(!!errors.title)}
        />
        <FieldError id="title-error" messages={errors.title} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="total_amount" className={labelClass}>
            Total cost{unit}
          </label>
          <input
            id="total_amount"
            name="total_amount"
            inputMode="decimal"
            autoComplete="off"
            value={values.total_amount}
            onChange={set("total_amount")}
            placeholder="0.00"
            aria-invalid={!!errors.total_amount || undefined}
            aria-describedby={errors.total_amount ? "total-error" : undefined}
            className={inputClass(!!errors.total_amount, "tabular-nums")}
          />
          <FieldError id="total-error" messages={errors.total_amount} />
        </div>
        <div>
          <label htmlFor="due_date" className={labelClass}>
            Due date <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            value={values.due_date}
            onChange={set("due_date")}
            aria-invalid={!!errors.due_date || undefined}
            className={inputClass(!!errors.due_date)}
          />
          <FieldError id="due-error" messages={errors.due_date} />
        </div>
      </div>

      {/* What was paid right away */}
      <fieldset>
        <legend className={labelClass}>Paid now</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PAID_NOW_OPTIONS.map((option) => {
            const checked = paidNow === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-md border p-4 transition-all",
                  checked
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                )}
              >
                <input type="radio" name="paid_choice" value={option.value} checked={checked} onChange={() => setPaidNow(option.value)} className="sr-only" />
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {paidNow !== "nothing" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {paidNow === "part" && (
            <div>
              <label htmlFor="part" className={labelClass}>
                Amount paid now{unit}
              </label>
              <input
                id="part"
                inputMode="decimal"
                autoComplete="off"
                value={values.part}
                onChange={set("part")}
                placeholder="0.00"
                className={inputClass(false, "tabular-nums")}
              />
            </div>
          )}
          <div>
            <label htmlFor="payment_method" className={labelClass}>
              Paid by
            </label>
            <Select id="payment_method" name="payment_method" value={values.payment_method} onChange={set("payment_method")} invalid={!!errors.payment_method}>
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </Select>
            <FieldError id="method-error" messages={errors.payment_method} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href={cancelHref} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
          Cancel
        </Link>
        <SubmitButton label="Save treatment" pendingLabel="Saving..." />
      </div>
    </form>
  );
}
