"use client";

import React, { useActionState, useState } from "react";
import type { PaymentFormState } from "@/lib/finance-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS, PaymentMethod } from "@/types/invoices";

export interface RecordPaymentFormProps {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  /** What is left to pay, as an amount string ("500.00"), to offer "Pay the rest" */
  balance: string;
  /** The balance formatted in the clinic's currency, for the button label */
  balanceLabel: string;
  currency?: string;
  /**
   * The open treatments of the patient, for a payment taken at a visit.
   * Without them the form records on one treatment (the page's).
   */
  treatments?: { id: string; label: string; balance: string; balanceLabel: string }[];
  submitLabel?: string;
}

const EMPTY = { amount: "", payment_method: PaymentMethod.Cash as string, notes: "" };

/**
 * Records money received: any amount up to what is left (the API refuses
 * more), with a one-click "Pay the rest". Clears itself after saving.
 */
export function RecordPaymentForm({
  action,
  balance,
  balanceLabel,
  currency,
  treatments,
  submitLabel = "Record payment",
}: RecordPaymentFormProps) {
  const [values, setValues] = useState({ ...EMPTY, invoice_id: treatments?.[0]?.id ?? "" });
  const [state, formAction] = useActionState(async (prev: PaymentFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.saved) setValues((v) => ({ ...EMPTY, invoice_id: v.invoice_id }));
    return result;
  }, {});
  const set =
    (field: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const errors = state.saved ? {} : state.fieldErrors ?? {};
  // At a visit, "Pay the rest" follows the chosen treatment
  const chosen = treatments?.find((t) => t.id === values.invoice_id);
  const rest = treatments ? chosen?.balance : balance;
  const unit = currency ? <span className="ml-1 font-medium text-slate-400">({currency})</span> : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert>{state.saved ? undefined : state.error}</FormAlert>
      {state.saved && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Payment recorded.
        </p>
      )}

      {treatments && (
        <div>
          <label htmlFor="invoice_id" className={labelClass}>
            For
          </label>
          <Select id="invoice_id" name="invoice_id" value={values.invoice_id} onChange={set("invoice_id")} invalid={!!errors.invoice_id}>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
            <option value="">This visit only (a separate charge)</option>
          </Select>
          <FieldError id="invoice-error" messages={errors.invoice_id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount{unit}
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            onChange={set("amount")}
            placeholder="0.00"
            aria-invalid={!!errors.amount || undefined}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            className={inputClass(!!errors.amount, "tabular-nums")}
          />
          <FieldError id="amount-error" messages={errors.amount} />
          {rest && (
            <button
              type="button"
              onClick={() => setValues((v) => ({ ...v, amount: rest }))}
              className="mt-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Pay the rest ({treatments ? chosen?.balanceLabel : balanceLabel})
            </button>
          )}
        </div>
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

      <div>
        <label htmlFor="notes" className={labelClass}>
          Note <span className="ml-1 font-medium text-slate-400">(optional)</span>
        </label>
        <input
          id="notes"
          name="notes"
          value={values.notes}
          onChange={set("notes")}
          placeholder="Receipt number, who paid, ..."
          className={inputClass(!!errors.notes)}
        />
        <FieldError id="notes-error" messages={errors.notes} />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} pendingLabel="Saving..." />
      </div>
    </form>
  );
}
