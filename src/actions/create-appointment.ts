"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import { readAppointmentForm, withTimeErrors, type AppointmentFormState } from "@/lib/appointment-form";

/**
 * Server Action: createAppointmentAction
 *
 * Books through POST /api/appointments (own clinic, can_create on
 * "Appointments", patient and staff checked, no double booking), then goes
 * back to `returnTo` (the calendar or list it was opened from).
 */
export async function createAppointmentAction(
  returnTo: string,
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const read = readAppointmentForm(formData);
  if ("fieldErrors" in read) return { error: "Please fix the highlighted fields.", fieldErrors: read.fieldErrors };

  const response = await sendApiJson(API_PATHS.appointments.list(), "POST", read.data);
  if (response?.status === 201) {
    revalidatePath(PATHS.appointments.list());
    redirect(returnTo);
  }
  return withTimeErrors(await toFormState(response, "This patient no longer exists."));
}
