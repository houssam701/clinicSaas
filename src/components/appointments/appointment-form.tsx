"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { UNASSIGNED, type AppointmentFormState } from "@/lib/appointment-form";
import { FieldError, FormAlert, SubmitButton, inputClass, labelClass } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { PatientPicker } from "@/components/appointments/patient-picker";
import { DURATION_OPTIONS, type AppointmentStaffMember } from "@/types/appointments";

export interface AppointmentFormValues {
  patient: { id: string; name: string } | null;
  /** An admin's id, UNASSIGNED, or "" when the user must still choose */
  user_id: string;
  date: string;
  time: string;
  duration_minutes: string;
  reason_for_visit: string;
}

type Mode = "create" | "edit";

const MODE_COPY: Record<Mode, { submit: string; pending: string }> = {
  create: { submit: "Book appointment", pending: "Booking..." },
  edit: { submit: "Save changes", pending: "Saving..." },
};

export interface AppointmentFormProps {
  mode: Mode;
  action: (state: AppointmentFormState, formData: FormData) => Promise<AppointmentFormState>;
  /** The clinic's IANA zone: date and time are entered in it */
  zone: string;
  staff: AppointmentStaffMember[];
  initialValues: AppointmentFormValues;
  cancelHref: string;
}

/**
 * Shared create/edit form for an appointment. Date and time are the clinic's
 * wall-clock time; the action turns them into one instant.
 */
export function AppointmentForm({ mode, action, zone, staff, initialValues, cancelHref }: AppointmentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const copy = MODE_COPY[mode];

  // Controlled so React 19 does not clear the fields after a failed attempt
  const [values, setValues] = useState(initialValues);
  const set =
    (field: Exclude<keyof AppointmentFormValues, "patient">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const errors = state.fieldErrors ?? {};
  const durations = DURATION_OPTIONS.map(String).includes(values.duration_minutes)
    ? DURATION_OPTIONS.map(String)
    : [...DURATION_OPTIONS.map(String), values.duration_minutes];

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="timezone" value={zone} />
      <FormAlert>{state.error}</FormAlert>

      <div>
        <p id="patient-label" className={labelClass}>
          Patient
        </p>
        <PatientPicker
          name="patient_id"
          initial={values.patient}
          invalid={!!errors.patient_id}
          describedBy={errors.patient_id ? "patient-error" : undefined}
        />
        <FieldError id="patient-error" messages={errors.patient_id} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="date" className={labelClass}>
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            value={values.date}
            onChange={set("date")}
            aria-invalid={!!errors.date || undefined}
            aria-describedby={errors.date ? "date-error" : undefined}
            className={inputClass(!!errors.date)}
          />
          <FieldError id="date-error" messages={errors.date} />
        </div>
        <div>
          <label htmlFor="time" className={labelClass}>
            Time
          </label>
          <input
            id="time"
            name="time"
            type="time"
            step={300}
            value={values.time}
            onChange={set("time")}
            aria-invalid={!!errors.time || undefined}
            aria-describedby={errors.time ? "time-error" : undefined}
            className={inputClass(!!errors.time)}
          />
          <FieldError id="time-error" messages={errors.time} />
        </div>
        <div>
          <label htmlFor="duration_minutes" className={labelClass}>
            Duration
          </label>
          <Select
            id="duration_minutes"
            name="duration_minutes"
            value={values.duration_minutes}
            onChange={set("duration_minutes")}
            invalid={!!errors.duration_minutes}
          >
            {durations.map((d) => (
              <option key={d} value={d}>
                {Number(d) < 60 ? `${d} min` : `${Math.floor(Number(d) / 60)} h${Number(d) % 60 ? ` ${Number(d) % 60} min` : ""}`}
              </option>
            ))}
          </Select>
          <FieldError id="duration-error" messages={errors.duration_minutes} />
        </div>
      </div>

      <div>
        <label htmlFor="user_id" className={labelClass}>
          With
        </label>
        <Select
          id="user_id"
          name="user_id"
          value={values.user_id}
          onChange={set("user_id")}
          invalid={!!errors.user_id}
          aria-describedby={errors.user_id ? "user-error" : "user-hint"}
        >
          {!values.user_id && (
            <option value="" disabled>
              Choose who it&apos;s with…
            </option>
          )}
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.first_name} {member.last_name}
            </option>
          ))}
          <option value={UNASSIGNED}>Unassigned (decide later)</option>
        </Select>
        {errors.user_id ? (
          <FieldError id="user-error" messages={errors.user_id} />
        ) : (
          <p id="user-hint" className="mt-1.5 text-xs text-slate-500">
            An admin cannot be booked twice at the same time.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reason_for_visit" className={labelClass}>
          Reason for visit <span className="ml-1 font-medium text-slate-400">(optional)</span>
        </label>
        <textarea
          id="reason_for_visit"
          name="reason_for_visit"
          rows={3}
          value={values.reason_for_visit}
          onChange={set("reason_for_visit")}
          placeholder="Why is the patient coming?"
          aria-invalid={!!errors.reason_for_visit || undefined}
          className={inputClass(!!errors.reason_for_visit, "resize-y")}
        />
        <FieldError id="reason-error" messages={errors.reason_for_visit} />
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
