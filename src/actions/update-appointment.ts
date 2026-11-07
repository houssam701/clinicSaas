"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import { readAppointmentForm, withTimeErrors, type AppointmentFormState } from "@/lib/appointment-form";

/**
 * Server Action: updateAppointmentAction
 *
 * Bound to an appointment id and the page to return to. Sends the form to
 * PATCH /api/appointments/[id] (can_edit, same clinic, no double booking).
 */
export async function updateAppointmentAction(
  appointmentId: string,
  returnTo: string,
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const read = readAppointmentForm(formData);
  if ("fieldErrors" in read) return { error: "Please fix the highlighted fields.", fieldErrors: read.fieldErrors };

  const response = await sendApiJson(API_PATHS.appointments.detail(appointmentId), "PATCH", read.data);
  if (response?.ok) {
    revalidatePath(PATHS.appointments.list());
    redirect(returnTo);
  }
  return withTimeErrors(await toFormState(response, "This appointment no longer exists."));
}
