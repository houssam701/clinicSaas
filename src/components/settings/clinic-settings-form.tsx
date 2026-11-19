"use client";

import React, { useActionState, useState } from "react";
import { HiOutlineBellAlert, HiOutlineInformationCircle } from "react-icons/hi2";
import { REMINDER_DAY_CHOICES } from "@/config/reminders";
import { cn } from "@/lib/utils";
import type { ClinicFormState } from "@/lib/clinic-form";
import type { PickerOption } from "@/lib/clinic-options";
import { formatMoney } from "@/lib/money";
import { Select } from "@/components/ui/select";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";

export interface ClinicSettingsValues {
  name: string;
  timezone: string;
  currency: string;
  /** Appointment reminder emails to patients */
  reminders_enabled: boolean;
  reminder_days_before: number;
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
 * The clinic's name, time zone, currency and appointment reminders. Changing
 * the time zone or the currency shows what it does before saving: times move
 * to the new zone, amounts are relabelled (not converted).
 */
export function ClinicSettingsForm({ action, initial: given, readOnly = false, timeZones, currencies }: ClinicSettingsFormProps) {
  // Always a defined value for the switch and the picker (a controlled input must never start
  // as undefined, e.g. with data loaded before these settings existed)
  const initial: ClinicSettingsValues = {
    ...given,
    reminders_enabled: Boolean(given.reminders_enabled),
    reminder_days_before: Number(given.reminder_days_before) || 1,
  };
  const [state, formAction] = useActionState(action, {});
  const [values, setValues] = useState(initial);
  const errors = state.fieldErrors ?? {};
  const changed =
    values.name.trim() !== initial.name ||
    values.timezone !== initial.timezone ||
    values.currency !== initial.currency ||
    values.reminders_enabled !== initial.reminders_enabled ||
    values.reminder_days_before !== initial.reminder_days_before;
  const dayLabel = (n: number) => (n === 1 ? "1 day" : `${n} days`);

  const set = (field: "name" | "timezone" | "currency") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
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

      {/* Appointment reminders */}
      <fieldset className="rounded-md border border-slate-200 dark:border-slate-800 p-5">
        <legend className="flex items-center gap-2 px-1 text-sm font-bold text-slate-700 dark:text-slate-300">
          <HiOutlineBellAlert aria-hidden="true" className="h-4 w-4 text-primary" />
          Appointment reminders
        </legend>

        <label className={cn("flex items-start justify-between gap-4", !readOnly && "cursor-pointer")}>
          <span>
            <span className="block text-sm font-semibold text-slate-800 dark:text-white">Email patients before their appointment</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Only patients with an email address. The email gives the day, the time and who the visit is with, never the reason for the visit.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            name="reminders_enabled"
            checked={values.reminders_enabled}
            onChange={(e) => setValues((prev) => ({ ...prev, reminders_enabled: e.target.checked }))}
            disabled={readOnly}
            aria-checked={values.reminders_enabled}
            className="peer sr-only"
          />
          {/* The visible switch (the checkbox above stays the real, focusable control) */}
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
              values.reminders_enabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-700",
              readOnly && "opacity-60"
            )}
          >
            <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", values.reminders_enabled ? "translate-x-5" : "translate-x-0.5")} />
          </span>
        </label>

        <div className={cn("mt-5", !values.reminders_enabled && "opacity-60")}>
          <label htmlFor="reminder_days_before" className={labelClass}>
            Send it
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              id="reminder_days_before"
              name="reminder_days_before"
              value={String(values.reminder_days_before)}
              onChange={(e) => setValues((prev) => ({ ...prev, reminder_days_before: Number(e.target.value) }))}
              disabled={readOnly}
              invalid={!!errors.reminder_days_before}
              wrapperClassName="w-40"
            >
              {REMINDER_DAY_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {dayLabel(n)}
                </option>
              ))}
            </Select>
            <span className="text-sm text-slate-600 dark:text-slate-300">before the appointment</span>
          </div>
          <FieldError id="reminder_days_before-error" messages={errors.reminder_days_before} />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {values.reminders_enabled
              ? `A visit on Friday at 10:00 gets its reminder from ${values.reminder_days_before === 1 ? "Thursday" : `${dayLabel(values.reminder_days_before)} earlier`} at about 10:00. Visits booked closer than that get one soon after booking.`
              : "Reminders are off: no emails are sent to patients."}
          </p>
        </div>
      </fieldset>

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
