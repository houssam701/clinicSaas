"use client";

import React, { useActionState, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi2";
import type { ClinicFormState } from "@/lib/clinic-form";
import type { PickerOption } from "@/lib/clinic-options";
import { formatMoney } from "@/lib/money";
import { Select } from "@/components/ui/select";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";

export interface ClinicSettingsValues {
  name: string;
  timezone: string;
  currency: string;
}

export interface ClinicSettingsFormProps {
  action: (state: ClinicFormState, formData: FormData) => Promise<ClinicFormState>;
  initial: ClinicSettingsValues;
  /** View-only (no Edit on "Settings"): fields are shown but cannot be changed */
  readOnly?: boolean;
  /** Built on the server (timeZoneOptions / currencyOptions), so the text matches when hydrating */
  timeZones: PickerOption[];
  currencies: PickerOption[];
}


/** A note under a field about what the change will do. */
function Impact({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <HiOutlineInformationCircle aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * The clinic's name, time zone and currency. Changing the time zone or the
 * currency shows what it does before saving: times move to the new zone,
 * amounts are relabelled (not converted).
 */
export function ClinicSettingsForm({ action, initial, readOnly = false, timeZones, currencies }: ClinicSettingsFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [values, setValues] = useState(initial);
  const errors = state.fieldErrors ?? {};
  const changed = values.name.trim() !== initial.name || values.timezone !== initial.timezone || values.currency !== initial.currency;

  const set = (field: keyof ClinicSettingsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form action={formAction} noValidate className="space-y-6">
      <FormAlert>{state.error}</FormAlert>

      <div>
        <label htmlFor="name" className={labelClass}>
          Clinic name
        </label>
        <input
          id="name"
          name="name"
          autoComplete="organization"
          value={values.name}
          onChange={set("name")}
          readOnly={readOnly}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : "name-hint"}
          className={inputClass(!!errors.name, readOnly ? "bg-slate-50 dark:bg-slate-800/60" : undefined)}
        />
        {errors.name ? (
          <FieldError id="name-error" messages={errors.name} />
        ) : (
          <p id="name-hint" className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Shown to your team and on receipts.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="timezone" className={labelClass}>
          Time zone
        </label>
        <Select id="timezone" name="timezone" value={values.timezone} onChange={set("timezone")} disabled={readOnly} invalid={!!errors.timezone}>
          {timeZones.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <FieldError id="timezone-error" messages={errors.timezone} />
        {values.timezone !== initial.timezone ? (
          <Impact>
            Appointments keep their exact moment, but their hours are shown in the new zone. &ldquo;Today&rdquo; and the calendar follow it too.
          </Impact>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">What &ldquo;today&rdquo; and appointment hours mean for your clinic.</p>
        )}
      </div>

      <div>
        <label htmlFor="currency" className={labelClass}>
          Currency
        </label>
        <Select id="currency" name="currency" value={values.currency} onChange={set("currency")} disabled={readOnly} invalid={!!errors.currency}>
          {currencies.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <FieldError id="currency-error" messages={errors.currency} />
        {values.currency !== initial.currency ? (
          <Impact>
            Amounts already recorded are not converted: {formatMoney(45000, initial.currency)} will read {formatMoney(45000, values.currency)}. Change it only
            if the clinic was set up with the wrong currency.
          </Impact>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">How treatments, payments and receipts show amounts.</p>
        )}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <SubmitButton label="Save changes" pendingLabel="Saving..." />
          {changed && (
            <button
              type="button"
              onClick={() => setValues(initial)}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Undo changes
            </button>
          )}
        </div>
      )}
    </form>
  );
}
