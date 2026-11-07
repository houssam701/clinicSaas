"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

/**
 * Server Action: deleteAppointmentAction
 *
 * DELETE /api/appointments/[id] (can_delete on "Appointments").
 */
export async function deleteAppointmentAction(appointmentId: string): Promise<{ error?: string }> {
  const response = await sendApiJson(API_PATHS.appointments.detail(appointmentId), "DELETE");
  if (!response) return { error: "Network error, please try again." };
  if (response.status === 204 || response.status === 404) {
    revalidatePath(PATHS.appointments.list());
    return {};
  }
  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not delete this appointment. Please try again." };
}
