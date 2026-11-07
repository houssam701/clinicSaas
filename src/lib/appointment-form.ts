/**
 * Shared helpers for the appointment form (create and edit).
 * Kept out of "use server" files: every export there becomes a callable action.
 */
import { zonedTimeToUtc, isIsoDate } from "@/lib/time-zone";
import type { FormState } from "@/lib/patient-form";

export type AppointmentFormField =
  | "patient_id"
  | "user_id"
  | "date"
  | "time"
  | "scheduled_time"
  | "duration_minutes"
  | "reason_for_visit";

export type AppointmentFormState = FormState<AppointmentFormField>;

/** The "With" choice for an appointment held by no one (yet). */
export const UNASSIGNED = "unassigned";

export type AppointmentFormData = {
  patient_id: string;
  user_id: string | null;
  scheduled_time: string;
  duration_minutes: number;
  reason_for_visit: string | null;
};

/**
 * Reads the form. The date and time are wall-clock values in the clinic's
 * zone (hidden "timezone" field) and become one UTC instant. Returns field
 * errors for a missing or malformed date/time instead of guessing.
 */
export function readAppointmentForm(
  formData: FormData
): { data: AppointmentFormData } | { fieldErrors: NonNullable<AppointmentFormState["fieldErrors"]> } {
  const text = (name: string) => ((formData.get(name) as string | null) ?? "").trim();
  const date = text("date");
  const time = text("time");
  const zone = text("timezone") || "UTC";

  const fieldErrors: NonNullable<AppointmentFormState["fieldErrors"]> = {};
  if (!isIsoDate(date)) fieldErrors.date = ["Choose a date."];
  if (!/^\d{2}:\d{2}$/.test(time)) fieldErrors.time = ["Choose a time."];
  if (!text("patient_id")) fieldErrors.patient_id = ["Choose a patient."];
  // "" = nothing chosen yet (Staff must choose); "unassigned" = on purpose, no one
  const withWhom = text("user_id");
  if (!withWhom) fieldErrors.user_id = ["Choose who this appointment is with."];
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    data: {
      patient_id: text("patient_id"),
      user_id: withWhom === UNASSIGNED ? null : withWhom,
      scheduled_time: zonedTimeToUtc(date, time, zone).toISOString(),
      duration_minutes: Number(text("duration_minutes")) || 30,
      reason_for_visit: text("reason_for_visit") || null,
    },
  };
}

/** API errors on scheduled_time (e.g. double booking) are shown under the time input. */
export function withTimeErrors(state: AppointmentFormState): AppointmentFormState {
  const scheduled = state.fieldErrors?.scheduled_time;
  if (!scheduled) return state;
  return { ...state, fieldErrors: { ...state.fieldErrors, time: scheduled } };
}
